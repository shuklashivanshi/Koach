import { learnerRepo, usersRepo } from '@koach/db';
import { blendLevels, diagnosticQuestions, scoreDiagnostic, subjects } from '@koach/kb';
import {
  DiagnosticOutcome,
  DiagnosticQuestions,
  DiagnosticSubmit,
  ProfileInput,
  ProfileResponse,
  SubjectList,
} from '@koach/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Deps } from '../../../deps';

const toProfile = (row: NonNullable<Awaited<ReturnType<typeof learnerRepo.getProfile>>>) => ({
  target: row.target,
  weekdayMinutes: row.weekdayMinutes,
  workHours: row.workHours,
  quietHours: row.quietHours,
  selfAssessment: row.selfAssessment,
  nudgeTone: row.nudgeTone,
  timezone: row.timezone,
  onboardedAt: row.onboardedAt?.toISOString() ?? null,
});

// Onboarding (PROF-01/02): profile, the subject list to self-rate, and the short check.
export const learnerProfileRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/subjects', { schema: { response: { 200: SubjectList } } }, () => ({
      subjects: subjects.map(({ id, title }) => ({ id, title })),
    }));

    app.get('/profile', { schema: { response: { 200: ProfileResponse } } }, async (request) => {
      const row = await learnerRepo.getProfile(deps.db, request.uid);
      return { profile: row ? toProfile(row) : null };
    });

    app.put(
      '/profile',
      { schema: { body: ProfileInput, response: { 200: ProfileResponse } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const existing = await learnerRepo.getProfile(deps.db, request.uid);
        const row = await learnerRepo.upsertProfile(deps.db, request.uid, request.body);
        // Self-ratings seed levels until the diagnostic (if taken) refines them.
        if (!existing?.onboardedAt) {
          await learnerRepo.setLevels(
            deps.db,
            request.uid,
            blendLevels(request.body.selfAssessment, null),
          );
        }
        return { profile: toProfile(row) };
      },
    );

    app.get('/diagnostic', { schema: { response: { 200: DiagnosticQuestions } } }, async () => ({
      questions: await diagnosticQuestions(deps.db, 20),
    }));

    app.post(
      '/diagnostic',
      { schema: { body: DiagnosticSubmit, response: { 200: DiagnosticOutcome } } },
      async (request) => {
        await usersRepo.upsert(deps.db, request.uid, request.userEmail);
        const profile = await learnerRepo.getProfile(deps.db, request.uid);
        const self = profile?.selfAssessment ?? {};
        const result = await scoreDiagnostic(deps.db, request.body.answers);
        const levels = blendLevels(self, result.total ? result.bySubject : null);
        await learnerRepo.setLevels(deps.db, request.uid, levels);
        if (result.total) await learnerRepo.addDiagnostic(deps.db, request.uid, result.answers);
        // Finishing (or skipping) the check completes onboarding.
        if (profile && !profile.onboardedAt) {
          await learnerRepo.upsertProfile(deps.db, request.uid, {
            weekdayMinutes: profile.weekdayMinutes,
            onboardedAt: deps.now(),
          });
        }
        const bySubject: Record<string, number> = {};
        for (const s of subjects) {
          const l = levels.find((x) => x.sectionId === s.sections[0]);
          if (l) bySubject[s.id] = l.level;
        }
        return {
          score: result.score,
          total: result.total,
          levels: bySubject,
          review: result.answers,
        };
      },
    );
  };
