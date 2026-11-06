import { schema, usersRepo } from '@koach/db';
import { CaAnswers, CaNodeItems, CaReport, CaResults, CaShare, CaToday } from '@koach/shared';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../deps';
import { recentForNode, todayQuiz } from '../../services/ca';
import { addCard, completeTask } from '../../services/study';

const s = schema;

// Current affairs for learners (CA-02..06).
export const caRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    const nodeTitles = async (ids: string[]) => {
      if (!ids.length) return new Map<string, string>();
      const rows = await deps.db
        .select({ id: s.syllabusNodes.id, title: s.syllabusNodes.title })
        .from(s.syllabusNodes)
        .where(inArray(s.syllabusNodes.id, ids));
      return new Map(rows.map((r) => [r.id, r.title]));
    };

    app.get('/ca/today', { schema: { response: { 200: CaToday } } }, async (request) => {
      const since = new Date(deps.now().getTime() - 36 * 3_600_000);
      const [items, questions, attempts] = await Promise.all([
        deps.db
          .select()
          .from(s.caItems)
          .where(and(eq(s.caItems.visible, true), gte(s.caItems.createdAt, since)))
          .orderBy(desc(s.caItems.relevance))
          .limit(15),
        todayQuiz(deps.db, deps.now()),
        deps.db.select().from(s.caAttempts).where(eq(s.caAttempts.uid, request.uid)),
      ]);
      const titles = await nodeTitles([...new Set(items.flatMap((i) => i.nodes))]);
      const done = new Map(attempts.map((a) => [a.questionId, a]));
      return {
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          summary: i.summary,
          url: i.url,
          source: i.source,
          nodes: i.nodes.map((id) => ({ id, title: titles.get(id) ?? id })),
          createdAt: i.createdAt.toISOString(),
        })),
        questions: questions.map((q) => {
          const a = done.get(q.id);
          return {
            id: q.id,
            kind: q.kind,
            stem: q.stem,
            options: q.options,
            source: { title: q.title, url: q.url, name: q.source },
            result: a ? { chosen: a.chosen, correct: a.correct } : null,
          };
        }),
      };
    });

    app.post(
      '/ca/answers',
      { schema: { body: CaAnswers, response: { 200: CaResults } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const ids = request.body.answers.map((a) => a.questionId);
        const rows = ids.length
          ? await deps.db
              .select({ q: s.caQuestions, nodes: s.caItems.nodes })
              .from(s.caQuestions)
              .innerJoin(s.caItems, eq(s.caItems.id, s.caQuestions.itemId))
              .where(and(inArray(s.caQuestions.id, ids), eq(s.caQuestions.status, 'live')))
          : [];
        const byId = new Map(rows.map((r) => [r.q.id, r]));
        const results = [];
        for (const a of request.body.answers) {
          const r = byId.get(a.questionId);
          if (!r) continue;
          const correct = a.chosen === r.q.answer;
          const inserted = await deps.db
            .insert(s.caAttempts)
            .values({ uid: request.uid, questionId: r.q.id, chosen: a.chosen, correct })
            .onConflictDoNothing()
            .returning();
          // Wrong answers go to the mistakes notebook and SRS, once (CA-05).
          if (inserted.length && !correct) {
            const nodeId = r.nodes[0] ?? null;
            await deps.db.insert(s.mistakes).values({
              uid: request.uid,
              caQuestionId: r.q.id,
              nodeId,
              chosen: a.chosen,
              correct: r.q.answer,
            });
            const right = r.q.options.find((o) => o.key === r.q.answer);
            await addCard(
              deps.db,
              request.uid,
              {
                nodeId: nodeId ?? 'current-affairs',
                kind: 'mistake',
                front: r.q.stem,
                back: `${right ? `(${right.key}) ${right.text}` : r.q.answer}. ${r.q.explanation}`,
              },
              deps.now(),
            );
          }
          results.push({
            questionId: r.q.id,
            correct,
            answer: r.q.answer,
            explanation: r.q.explanation,
          });
        }
        if (request.body.taskId)
          await completeTask(deps.db, request.uid, request.body.taskId, deps.now());
        return { results };
      },
    );

    /** A report pulls the question for everyone at once (CA-05). */
    app.post(
      '/ca/questions/:id/report',
      {
        schema: {
          params: z.object({ id: z.string().uuid() }),
          body: CaReport,
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        await deps.db
          .insert(s.caReports)
          .values({
            uid: request.uid,
            questionId: request.params.id,
            reason: request.body.reason ?? null,
          });
        await deps.db
          .update(s.caQuestions)
          .set({ status: 'pulled', reports: sql`${s.caQuestions.reports} + 1` })
          .where(eq(s.caQuestions.id, request.params.id));
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/ca/share',
      { schema: { body: CaShare, response: { 204: z.null() } } },
      async (request, reply) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        await deps.db.insert(s.caShared).values({ uid: request.uid, url: request.body.url });
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/ca/node/:nodeId',
      {
        schema: {
          params: z.object({ nodeId: z.string().max(200) }),
          response: { 200: CaNodeItems },
        },
      },
      async (request) => ({
        items: (await recentForNode(deps.db, request.params.nodeId, deps.now())).map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        })),
      }),
    );
  };
