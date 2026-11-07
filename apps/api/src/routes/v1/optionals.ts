import { usersRepo } from '@koach/db';
import { FIT_WEIGHTS, type QuizAnswers } from '@koach/kb';
import {
  ApiErrorBody,
  CoachQuestion,
  CoachReply,
  DecisionStatus,
  FitQuiz,
  FitRanking,
  OptionalChoice,
  OptionalChoiceResult,
  OptionalCompare,
  OptionalExplorer,
  OptionalList,
  OptionalOutline,
  StressReply,
  StressRequest,
} from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Deps } from '../../deps';
import {
  allOptionals,
  choiceResult,
  decisionStatus,
  explorer,
  fitsFor,
  optionalCoach,
  optionalOutline,
  recordChoice,
  runQuiz,
} from '../../services/optionals';
import { runStress } from '../../services/optional-stress';

// Optional Discovery (OPT-01..05).
export const optionalRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/optionals', { schema: { response: { 200: OptionalList } } }, async () => ({
      optionals: (await allOptionals(deps.db))
        .map((o) => ({
          slug: o.slug,
          name: o.profile.name,
          summary: o.profile.summary,
          success: o.stats,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));

    app.get(
      '/optionals/item/:slug',
      {
        schema: {
          params: z.object({ slug: z.string().max(80) }),
          response: { 200: OptionalExplorer, 404: ApiErrorBody },
        },
      },
      async (request, reply) =>
        (await explorer(deps.db, request.params.slug, request.uid)) ??
        reply.code(404).send({ error: 'not_found' }),
    );

    app.get(
      '/optionals/compare',
      {
        schema: {
          querystring: z.object({ slugs: z.string().max(300) }),
          response: { 200: OptionalCompare },
        },
      },
      async (request) => {
        const slugs = request.query.slugs.split(',').filter(Boolean).slice(0, 3);
        const items = await Promise.all(slugs.map((sl) => explorer(deps.db, sl, request.uid)));
        return { optionals: items.filter((x) => !!x) };
      },
    );

    app.post(
      '/optionals/quiz',
      { schema: { body: FitQuiz, response: { 200: FitRanking } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const ranking = await runQuiz(deps.db, request.uid, request.body as QuizAnswers);
        return { ...ranking, weights: { ...FIT_WEIGHTS } };
      },
    );

    app.get(
      '/optionals/fits',
      { schema: { response: { 200: FitRanking, 404: ApiErrorBody } } },
      async (request, reply) => {
        const ranking = await fitsFor(deps.db, request.uid);
        return ranking
          ? { ...ranking, weights: { ...FIT_WEIGHTS } }
          : reply.code(404).send({ error: 'not_found' });
      },
    );

    app.get(
      '/optionals/status',
      { schema: { response: { 200: DecisionStatus, 404: ApiErrorBody } } },
      async (request, reply) =>
        (await decisionStatus(deps.db, request.uid, deps.now())) ??
        reply.code(404).send({ error: 'not_found' }),
    );

    app.get(
      '/optionals/outline',
      { schema: { response: { 200: OptionalOutline, 404: ApiErrorBody } } },
      async (request, reply) =>
        (await optionalOutline(deps.db, request.uid, deps.now())) ??
        reply.code(404).send({ error: 'not_found' }),
    );

    app.post(
      '/optionals/coach',
      { schema: { body: CoachQuestion, response: { 200: CoachReply } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        return optionalCoach(
          deps.db,
          deps.ai,
          request.uid,
          request.body.question,
          request.body.slugs,
          deps.now(),
          request.body.history,
        );
      },
    );

    app.post(
      '/optionals/stress',
      {
        schema: {
          body: StressRequest,
          response: { 200: StressReply, 404: ApiErrorBody },
        },
      },
      async (request, reply) =>
        (await runStress(deps.db, deps.ai, request.uid, request.body, deps.now())) ??
        reply.code(404).send({ error: 'not_found' }),
    );

    app.post(
      '/optionals/choice',
      {
        schema: {
          body: OptionalChoice,
          response: { 200: OptionalChoiceResult, 404: ApiErrorBody },
        },
      },
      async (request, reply) => {
        if (
          !(await recordChoice(
            deps.db,
            request.uid,
            request.body.slug,
            request.body.reasons,
            deps.now(),
          ))
        ) {
          return reply.code(404).send({ error: 'not_found' });
        }
        return (await choiceResult(deps.db, request.uid, deps.now()))!;
      },
    );
  };
