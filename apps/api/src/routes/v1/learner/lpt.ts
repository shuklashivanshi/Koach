import { learnerRepo, usersRepo } from '@koach/db';
import {
  applyEvidence,
  forms,
  type GameScores,
  type Pattern,
  patternScores,
  profileLine,
  retestDue,
  scoreGrid,
  scoreMapPins,
  scoreOrder,
  scoreRecallLists,
} from '@koach/lpt';
import {
  ApiErrorBody,
  LptAudio,
  LptEvidence,
  LptForm,
  LptProfileResponse,
  LptSubmit,
  TranscribeRequest,
  TranscribeResponse,
} from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../../deps';
import { clipFile, listText } from '../../../services/lpt-audio';

// Learning Pattern Test (LPT-01..03). Every score is computed here from raw answers; the client
// never sees the recall lists as text, only as audio.

const DELAYED_PLACES = 3;
const DELAYED_LIST = 1;
const HIDDEN_LIMIT_MS = 20_000;

const IdeaScore = z.object({ recalled: z.array(z.number().int()) });

type LptRow = NonNullable<Awaited<ReturnType<typeof learnerRepo.latestLpt>>>;
const toProfile = (row: LptRow) => {
  const scores = {
    visual: row.visual,
    auditory: row.auditory,
    readwrite: row.readwrite,
    kinesthetic: row.kinesthetic,
  };
  return {
    scores,
    line: profileLine(scores),
    lowConfidence: row.lowConfidence === 1,
    takenAt: row.takenAt.toISOString(),
    retestDue: retestDue(row.takenAt).toISOString(),
  };
};

export const lptRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    /** Next form: A first, then alternate so a retest never repeats items. */
    const nextForm = async (uid: string) =>
      (await learnerRepo.latestLpt(deps.db, uid))?.form === 'A' ? forms.B : forms.A;

    app.get('/lpt/form', { schema: { response: { 200: LptForm } } }, async (request) => {
      const f = await nextForm(request.uid);
      return {
        form: f.id,
        places: f.places,
        grid: f.grid,
        listLengths: f.lists.map((l) => l.length),
        passage: f.passage.text,
        events: [...f.events].sort(() => Math.random() - 0.5),
        delayed: {
          places: f.places.slice(0, DELAYED_PLACES).map((p) => p.name),
          list: DELAYED_LIST,
        },
      };
    });

    app.get(
      '/lpt/audio/:form/:list',
      {
        schema: {
          params: z.object({
            form: z.enum(['A', 'B']),
            list: z.coerce.number().int().min(0).max(4),
          }),
          response: { 200: LptAudio, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const list = forms[request.params.form].lists[request.params.list];
        if (!list) return reply.code(404).send({ error: 'not_found' });
        const text = listText(list);
        // A current pre-generated clip is free and instant; anything else falls back to live TTS.
        const clip = await deps.lptClips?.({
          file: clipFile(request.params.form, request.params.list),
          text,
        });
        if (clip) return { audioBase64: clip };
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const speech = await deps.ai.speak({ feature: 'lpt.listen', text, uid: request.uid });
        return { audioBase64: speech.audioBase64 };
      },
    );

    app.post(
      '/lpt/results',
      { schema: { body: LptSubmit, response: { 200: LptProfileResponse } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const body = request.body;
        const f = forms[body.form];
        const ideas = async (text: string) => {
          if (!text.trim()) return 0;
          const res = await deps.ai.json({
            feature: 'lpt.readwrite',
            tier: 'lite',
            schema: IdeaScore,
            uid: request.uid,
            prompt: `A learner read a passage and wrote what they remembered. For each numbered
idea unit below, decide whether their text conveys it (wording may differ; minor detail errors are
fine). Return the numbers of the idea units recalled.

Idea units:
${f.passage.ideaUnits.map((u, i) => `${i + 1}. ${u}`).join('\n')}

Learner's text:
"""${text}"""`,
          });
          const hits = new Set(
            res.data.recalled.filter((n) => n >= 1 && n <= f.passage.ideaUnits.length),
          );
          return hits.size / f.passage.ideaUnits.length;
        };
        const delayedPlaces = f.places.slice(0, DELAYED_PLACES);
        const delayedList = f.lists[DELAYED_LIST] ?? [];
        const [readNow, readLater] = await Promise.all([
          ideas(body.immediate.readWrite),
          ideas(body.delayed.readWrite),
        ]);
        const immediate: GameScores = {
          mapPins: scoreMapPins(f.places, body.immediate.mapPins),
          grid: scoreGrid(f.grid, body.immediate.grid),
          listen: scoreRecallLists(f.lists, body.immediate.listen),
          readWrite: readNow,
          arrange: scoreOrder(f.events, body.immediate.arrange),
        };
        const delayed: Partial<GameScores> = {
          mapPins: scoreMapPins(delayedPlaces, body.delayed.mapPins),
          listen: scoreRecallLists([delayedList], [body.delayed.listen]),
          readWrite: readLater,
          arrange: scoreOrder(f.events, body.delayed.arrange),
        };
        const scores = patternScores(immediate, delayed);
        const row = await learnerRepo.addLpt(deps.db, {
          uid: request.uid,
          form: f.id,
          raw: { immediate: { ...immediate }, delayed: { ...delayed } },
          ...scores,
          lowConfidence: body.hiddenMs > HIDDEN_LIMIT_MS || body.skipped.length > 0 ? 1 : 0,
          takenAt: deps.now(),
        });
        return { profile: toProfile(row) };
      },
    );

    app.get(
      '/lpt/profile',
      { schema: { response: { 200: LptProfileResponse } } },
      async (request) => {
        const row = await learnerRepo.latestLpt(deps.db, request.uid);
        return { profile: row ? toProfile(row) : null };
      },
    );

    /** LPT-03: recall on cues of a pattern nudges that pattern's score. */
    app.post(
      '/lpt/evidence',
      { schema: { body: LptEvidence, response: { 200: LptProfileResponse } } },
      async (request) => {
        const row = await learnerRepo.latestLpt(deps.db, request.uid);
        if (!row) return { profile: null };
        const pattern: Pattern = request.body.pattern;
        const next = applyEvidence(row[pattern], request.body.success);
        await learnerRepo.updateLpt(deps.db, row.id, { [pattern]: next });
        return { profile: toProfile({ ...row, [pattern]: next }) };
      },
    );

    // Spoken answers (Listen & Recall): transcribed and discarded, never stored (D-03).
    app.post(
      '/speech/transcribe',
      {
        bodyLimit: 5_000_000,
        schema: { body: TranscribeRequest, response: { 200: TranscribeResponse } },
      },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const res = await deps.ai.transcribe({
          feature: 'lpt.listen.speech',
          audioBase64: request.body.audioBase64,
          seconds: request.body.seconds,
          uid: request.uid,
        });
        return { text: res.text };
      },
    );
  };
