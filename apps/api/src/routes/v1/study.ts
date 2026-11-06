import { schema, usersRepo } from '@koach/db';
import { daysUntil, PRELIMS } from '@koach/planner';
import {
  ApiErrorBody,
  AnswerList,
  DueCards,
  GradeRequest,
  GradeResponse,
  Heatmap,
  LearnOutcome,
  LearnResult,
  LearnSession,
  MistakeCause,
  MistakeList,
  PracticeSet,
  ReplanRequest,
  TodayPlan,
} from '@koach/shared';
import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../deps';
import { learnSession } from '../../services/learn';
import {
  completeTask,
  dueCards,
  gradeCard,
  heatmap,
  recordAnswers,
  recordLearn,
  replanToday,
  todayPlan,
} from '../../services/study';

const s = schema;

// The daily loop (Phase 4): plan, Learn sessions, reviews, practice, mistakes, heatmap.
export const studyRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    const view = async (uid: string, plan: Awaited<ReturnType<typeof todayPlan>>) => ({
      day: plan.day,
      minutes: plan.minutes,
      daysToPrelims: daysUntil(deps.now(), PRELIMS),
      note: plan.note,
      tasks: plan.tasks.map((t) => ({
        id: t.id,
        kind: t.kind,
        nodeId: t.nodeId,
        title: t.title,
        minutes: t.minutes,
        goal: t.goal,
        reason: t.reason,
        source: t.source,
        status: t.status,
      })),
      uid,
    });

    app.get('/plan/today', { schema: { response: { 200: TodayPlan } } }, async (request) => {
      await usersRepo.upsert(deps.db, request.uid, request.userEmail);
      return view(request.uid, await todayPlan(deps.db, request.uid, deps.now()));
    });

    app.post(
      '/plan/replan',
      { schema: { body: ReplanRequest, response: { 200: TodayPlan } } },
      async (request) =>
        view(
          request.uid,
          await replanToday(deps.db, request.uid, deps.now(), request.body.minutes),
        ),
    );

    app.post(
      '/plan/tasks/:id/done',
      { schema: { params: z.object({ id: z.string().uuid() }), response: { 204: z.null() } } },
      async (request, reply) => {
        await completeTask(deps.db, request.uid, request.params.id, deps.now());
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/learn/:nodeId',
      {
        schema: {
          params: z.object({ nodeId: z.string().max(200) }),
          response: { 200: LearnSession, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const session = await learnSession(deps, request.uid, request.params.nodeId);
        return session ?? reply.code(404).send({ error: 'not_found' });
      },
    );

    app.post(
      '/learn/:nodeId',
      {
        schema: {
          params: z.object({ nodeId: z.string().max(200) }),
          body: LearnResult,
          response: { 200: LearnOutcome, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const res = await recordLearn(
          deps.db,
          request.uid,
          request.params.nodeId,
          request.body,
          deps.now(),
        );
        if (!res) return reply.code(404).send({ error: 'not_found' });
        if (request.body.taskId)
          await completeTask(deps.db, request.uid, request.body.taskId, deps.now());
        return { mastery: res.mastery, results: res.pyq.results };
      },
    );

    app.get(
      '/practice/:nodeId',
      {
        schema: {
          params: z.object({ nodeId: z.string().max(200) }),
          response: { 200: PracticeSet },
        },
      },
      async (request) => {
        const rows = await deps.db
          .select({ id: s.pyqs.id, year: s.pyqs.year, text: s.pyqs.text, options: s.pyqs.options })
          .from(s.pyqs)
          .innerJoin(s.pyqTags, eq(s.pyqTags.pyqId, s.pyqs.id))
          .where(
            and(
              eq(s.pyqTags.nodeId, request.params.nodeId),
              eq(s.pyqs.exam, 'prelims'),
              isNotNull(s.pyqs.answer),
            ),
          )
          .limit(15);
        return {
          pyqs: rows
            .filter((r) => r.options?.length === 4)
            .map((r) => ({ ...r, options: r.options ?? [] })),
        };
      },
    );

    app.post(
      '/practice',
      {
        schema: {
          body: z.object({ answers: AnswerList, taskId: z.string().uuid().optional() }),
          response: { 200: LearnOutcome },
        },
      },
      async (request) => {
        const res = await recordAnswers(deps.db, request.uid, request.body.answers, deps.now());
        if (request.body.taskId)
          await completeTask(deps.db, request.uid, request.body.taskId, deps.now());
        return { mastery: res.total ? res.correct / res.total : 0, results: res.results };
      },
    );

    app.get(
      '/reviews/due',
      {
        schema: {
          querystring: z.object({ node: z.string().max(200).optional() }),
          response: { 200: DueCards },
        },
      },
      async (request) => ({
        cards: (await dueCards(deps.db, request.uid, deps.now(), request.query.node)).map((c) => ({
          id: c.id,
          nodeId: c.nodeId,
          kind: c.kind,
          front: c.front,
          back: c.back,
        })),
      }),
    );

    app.post(
      '/reviews/:id',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          body: GradeRequest,
          response: { 200: GradeResponse, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        const res = await gradeCard(
          deps.db,
          request.uid,
          request.params.id,
          request.body.grade,
          deps.now(),
        );
        if (!res) return reply.code(404).send({ error: 'not_found' });
        return { due: new Date(res.due).toISOString(), mastery: res.mastery };
      },
    );

    app.get('/mistakes', { schema: { response: { 200: MistakeList } } }, async (request) => {
      const rows = await deps.db
        .select({ m: s.mistakes, text: s.pyqs.text })
        .from(s.mistakes)
        .leftJoin(s.pyqs, eq(s.pyqs.id, s.mistakes.pyqId))
        .where(eq(s.mistakes.uid, request.uid))
        .orderBy(desc(s.mistakes.createdAt))
        .limit(100);
      const since = new Date(deps.now().getTime() - 30 * 86_400_000);
      const recent = await deps.db
        .select({ cause: s.mistakes.cause })
        .from(s.mistakes)
        .where(
          and(
            eq(s.mistakes.uid, request.uid),
            gte(s.mistakes.createdAt, since),
            isNotNull(s.mistakes.cause),
          ),
        );
      const traps: Record<string, number> = {};
      for (const r of recent) if (r.cause) traps[r.cause] = (traps[r.cause] ?? 0) + 1;
      return {
        mistakes: rows.map(({ m, text }) => ({
          id: m.id,
          pyqId: m.pyqId,
          nodeId: m.nodeId,
          text,
          chosen: m.chosen,
          correct: m.correct,
          cause: m.cause as (typeof MistakeCause)['_output']['cause'] | null,
          createdAt: m.createdAt.toISOString(),
        })),
        traps,
      };
    });

    app.post(
      '/mistakes/:id/cause',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          body: MistakeCause,
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        await deps.db
          .update(s.mistakes)
          .set({ cause: request.body.cause })
          .where(and(eq(s.mistakes.uid, request.uid), eq(s.mistakes.id, request.params.id)));
        return reply.code(204).send(null);
      },
    );

    app.get('/mastery', { schema: { response: { 200: Heatmap } } }, async (request) => ({
      sections: await heatmap(deps.db, request.uid, deps.now()),
    }));
  };
