import { schema, usersRepo } from '@koach/db';
import type { CueFormat } from '@koach/lpt';
import {
  ApiErrorBody,
  CardsAdded,
  CheckIn,
  CoachState,
  CueFormats,
  CueResponse,
  LptAudio,
  Palace,
  Playlist,
  RecallGrade,
} from '@koach/shared';
import { and, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../deps';
import { loadFactor, weekOf, writeCoachNote } from '../../services/coach';
import { allFormats, clozeToCards, getCue, gradeRecall, rateCue } from '../../services/cues';
import { istDay } from '../../services/time';

const s = schema;

// "Make it stick" (CUE-01..08) and coaching (NUDGE-02/03).
export const cueRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      '/cues/:nodeId',
      {
        schema: {
          params: z.object({ nodeId: z.string().max(200) }),
          querystring: z.object({ format: z.enum(CueFormats).optional() }),
          response: { 200: CueResponse, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const res = await getCue(deps, request.uid, request.params.nodeId, request.query.format);
        if (!res) return reply.code(404).send({ error: 'not_found' });
        const groups = allFormats();
        if ('needsPalace' in res)
          return { status: 'palace' as const, format: res.format, cue: null, groups };
        if ('failed' in res)
          return { status: 'failed' as const, format: res.format, cue: null, groups };
        const c = res.cue;
        return {
          status: 'ready' as const,
          format: res.format,
          cue: {
            id: c.id,
            nodeId: c.nodeId,
            format: c.format as CueFormat,
            content: c.content,
            rating: c.rating,
          },
          groups,
        };
      },
    );

    app.post(
      '/cues/item/:id/rate',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          body: z.object({ up: z.boolean() }),
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        await rateCue(deps, request.uid, request.params.id, request.body.up);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/cues/item/:id/grade',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          body: z.object({ text: z.string().min(1).max(3000) }),
          response: { 200: RecallGrade, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const res = await gradeRecall(deps, request.uid, request.params.id, request.body.text);
        return res ?? reply.code(404).send({ error: 'not_found' });
      },
    );

    app.post(
      '/cues/item/:id/cards',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          response: { 200: CardsAdded },
        },
      },
      async (request) => ({ added: await clozeToCards(deps, request.uid, request.params.id) }),
    );

    app.get(
      '/cues/item/:id/audio',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          response: { 200: LptAudio, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const [cue] = await deps.db
          .select()
          .from(s.cues)
          .where(and(eq(s.cues.uid, request.uid), eq(s.cues.id, request.params.id)));
        if (!cue || !['spoken', 'chant', 'mnemonic'].includes(cue.format))
          return reply.code(404).send({ error: 'not_found' });
        const text =
          cue.format === 'spoken'
            ? String(cue.content.script)
            : cue.format === 'chant'
              ? (cue.content.lines as string[]).join('. ')
              : String(cue.content.device);
        const speech = await deps.ai.speak({
          feature: `cue.audio.${cue.format}`,
          text,
          uid: request.uid,
        });
        return { audioBase64: speech.audioBase64 };
      },
    );

    /** Background revision playlist: spoken cues for nodes studied or reviewed in 14 days. */
    app.get('/cues/playlist', { schema: { response: { 200: Playlist } } }, async (request) => {
      const since = new Date(deps.now().getTime() - 14 * 86_400_000);
      const recent = await deps.db
        .select({ nodeId: s.nodeMastery.nodeId })
        .from(s.nodeMastery)
        .where(and(eq(s.nodeMastery.uid, request.uid), gte(s.nodeMastery.updatedAt, since)));
      const ids = recent.map((r) => r.nodeId);
      if (!ids.length) return { tracks: [] };
      const cues = await deps.db
        .select({ id: s.cues.id, nodeId: s.cues.nodeId, title: s.syllabusNodes.title })
        .from(s.cues)
        .innerJoin(s.syllabusNodes, eq(s.syllabusNodes.id, s.cues.nodeId))
        .where(
          and(
            eq(s.cues.uid, request.uid),
            inArray(s.cues.nodeId, ids),
            inArray(s.cues.format, ['spoken', 'chant']),
          ),
        )
        .orderBy(desc(s.cues.createdAt))
        .limit(30);
      return { tracks: cues.map((c) => ({ cueId: c.id, nodeId: c.nodeId, title: c.title })) };
    });

    app.get('/palace', { schema: { response: { 200: Palace } } }, async (request) => {
      const [p] = await deps.db
        .select()
        .from(s.memoryPalaces)
        .where(eq(s.memoryPalaces.uid, request.uid));
      return { rooms: p?.rooms ?? [] };
    });

    app.put('/palace', { schema: { body: Palace, response: { 200: Palace } } }, async (request) => {
      await usersRepo.upsert(deps.db, request.uid, request.userEmail);
      await deps.db
        .insert(s.memoryPalaces)
        .values({ uid: request.uid, rooms: request.body.rooms })
        .onConflictDoUpdate({ target: s.memoryPalaces.uid, set: { rooms: request.body.rooms } });
      // Placements depend on the rooms, so earlier palace cues are regenerated on next open.
      await deps.db
        .delete(s.cues)
        .where(and(eq(s.cues.uid, request.uid), eq(s.cues.format, 'palace')));
      return request.body;
    });

    app.get('/coach', { schema: { response: { 200: CoachState } } }, async (request) => {
      const now = deps.now();
      const week = weekOf(now);
      const prevWeek = weekOf(new Date(now.getTime() - 7 * 86_400_000));
      const [note] = await deps.db
        .select()
        .from(s.coachNotes)
        .where(
          and(
            eq(s.coachNotes.uid, request.uid),
            isNull(s.coachNotes.readAt),
            inArray(s.coachNotes.week, [week, prevWeek]),
          ),
        )
        .orderBy(desc(s.coachNotes.week))
        .limit(1);
      const dow = (new Date(`${istDay(now)}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
      const [answered] = await deps.db
        .select()
        .from(s.wellbeing)
        .where(and(eq(s.wellbeing.uid, request.uid), inArray(s.wellbeing.week, [week, prevWeek])))
        .orderBy(desc(s.wellbeing.createdAt))
        .limit(1);
      // Asked Sunday to Tuesday, once per week.
      const window = dow === 6 || dow <= 1;
      const checkWeek = dow === 6 ? week : prevWeek;
      return {
        note: note ? { week: note.week, lines: note.lines } : null,
        checkInDue: window && answered?.week !== checkWeek,
        lighterWeek: (await loadFactor(deps.db, request.uid, now)) < 1,
      };
    });

    app.post(
      '/coach/note/read',
      { schema: { response: { 204: z.null() } } },
      async (request, reply) => {
        await deps.db
          .update(s.coachNotes)
          .set({ readAt: deps.now() })
          .where(and(eq(s.coachNotes.uid, request.uid), isNull(s.coachNotes.readAt)));
        return reply.code(204).send(null);
      },
    );

    /** Dev/testing: write this week's note now. */
    app.post('/coach/note', { schema: { response: { 204: z.null() } } }, async (request, reply) => {
      await writeCoachNote(deps.db, deps.ai, request.uid, deps.now());
      return reply.code(204).send(null);
    });

    app.post(
      '/coach/checkin',
      { schema: { body: CheckIn, response: { 200: CoachState.pick({ lighterWeek: true }) } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const now = deps.now();
        const dow = (new Date(`${istDay(now)}T00:00:00Z`).getUTCDay() + 6) % 7;
        const week = dow === 6 ? weekOf(now) : weekOf(new Date(now.getTime() - 7 * 86_400_000));
        await deps.db
          .insert(s.wellbeing)
          .values({ uid: request.uid, week, level: request.body.level, createdAt: now })
          .onConflictDoUpdate({
            target: [s.wellbeing.uid, s.wellbeing.week],
            set: { level: request.body.level, createdAt: now },
          });
        return { lighterWeek: request.body.level === 'heavy' };
      },
    );
  };
