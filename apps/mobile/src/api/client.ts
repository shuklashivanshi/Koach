import {
  AiPingResponse,
  ApiErrorBody,
  EmailVerifyResponse,
  ExportBundleSchema,
  HealthResponse,
  MeSchema,
  type ReviewPyqDecision,
  ReviewSample,
  type ReviewSourceDecision,
  ReviewSummary,
  SourceCatalogue,
  DiagnosticOutcome,
  DiagnosticQuestions,
  type DiagnosticSubmit,
  LptAudio,
  LptForm,
  LptProfileResponse,
  type LptSubmit,
  type ProfileInput,
  ProfileResponse,
  SubjectList,
  TranscribeResponse,
  DueCards,
  GradeResponse,
  Heatmap,
  LearnOutcome,
  LearnSession,
  MistakeList,
  type NotificationSettings,
  NotificationSettingsResponse,
  PracticeSet,
  TodayPlan,
  CaNodeItems,
  CaResults,
  CaToday,
  CardsAdded,
  CoachState,
  type CueFormatName,
  CueResponse,
  Palace,
  Playlist,
  RecallGrade,
  CoachReply,
  DecisionStatus,
  type FitQuiz,
  FitRanking,
  OptionalCompare,
  OptionalExplorer,
  OptionalList,
} from '@koach/shared';
import type { z } from 'zod';
import { currentIdToken } from '../auth/firebase';
import { appConfig } from '../config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorBody['error'] | 'network',
  ) {
    super(`API ${status} ${code}`);
  }
}

let onUnauthorized: () => void = () => {};
/** Called on any 401 so the app can sign the user out (D-06). */
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function request<S extends z.ZodType | null>(
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<S extends z.ZodType ? z.infer<S> : void> {
  const token = await currentIdToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${appConfig.apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (res.status === 401) onUnauthorized();
  if (!res.ok) {
    const body = ApiErrorBody.safeParse(await res.json().catch(() => null));
    throw new ApiError(res.status, body.success ? body.data.error : 'internal');
  }
  if (schema === null || res.status === 204) return undefined as never;
  return schema.parse(await res.json()) as never;
}

export const api = {
  health: () => request('/health', HealthResponse),
  me: () => request('/v1/me', MeSchema),
  emailStart: (email: string) =>
    request('/v1/auth/email/start', null, { method: 'POST', body: JSON.stringify({ email }) }),
  emailVerify: (email: string, code: string) =>
    request('/v1/auth/email/verify', EmailVerifyResponse, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  exportData: () => request('/v1/me/export', ExportBundleSchema),
  deleteAccount: () => request('/v1/me', null, { method: 'DELETE' }),
  aiPing: () => request('/v1/ai/ping', AiPingResponse),
  // Admin review (KB-07); 403 unless the signed-in email is on ADMIN_EMAILS.
  reviewSummary: () => request('/v1/admin/review/summary', ReviewSummary),
  reviewSample: (type: 'pyq' | 'source', n = 10) =>
    request(`/v1/admin/review/sample?type=${type}&n=${n}`, ReviewSample),
  reviewPyq: (id: string, decision: ReviewPyqDecision) =>
    request(`/v1/admin/review/pyq/${encodeURIComponent(id)}`, null, {
      method: 'POST',
      body: JSON.stringify(decision),
    }),
  reviewSource: (nodeId: string, decision: ReviewSourceDecision) =>
    request(`/v1/admin/review/source/${encodeURIComponent(nodeId)}`, null, {
      method: 'POST',
      body: JSON.stringify(decision),
    }),
  sourceCatalogue: () => request('/v1/admin/sources', SourceCatalogue),
  // Onboarding (PROF-01/02)
  subjects: () => request('/v1/subjects', SubjectList),
  profile: () => request('/v1/profile', ProfileResponse),
  saveProfile: (p: ProfileInput) =>
    request('/v1/profile', ProfileResponse, { method: 'PUT', body: JSON.stringify(p) }),
  diagnostic: () => request('/v1/diagnostic', DiagnosticQuestions),
  submitDiagnostic: (d: DiagnosticSubmit) =>
    request('/v1/diagnostic', DiagnosticOutcome, { method: 'POST', body: JSON.stringify(d) }),
  // Learning Pattern Test (LPT-01..03)
  lptForm: () => request('/v1/lpt/form', LptForm),
  lptAudio: (form: 'A' | 'B', list: number) => request(`/v1/lpt/audio/${form}/${list}`, LptAudio),
  submitLpt: (s: LptSubmit) =>
    request('/v1/lpt/results', LptProfileResponse, { method: 'POST', body: JSON.stringify(s) }),
  lptProfile: () => request('/v1/lpt/profile', LptProfileResponse),
  // Daily loop (Phase 4)
  today: () => request('/v1/plan/today', TodayPlan),
  replan: (minutes: number) =>
    request('/v1/plan/replan', TodayPlan, { method: 'POST', body: JSON.stringify({ minutes }) }),
  taskDone: (id: string) => request(`/v1/plan/tasks/${id}/done`, null, { method: 'POST' }),
  learn: (nodeId: string) => request(`/v1/learn/${encodeURIComponent(nodeId)}`, LearnSession),
  learnResult: (
    nodeId: string,
    body: {
      recall: { q: string; a: string; got: boolean }[];
      answers: { pyqId: string; chosen: string | null }[];
      taskId?: string;
    },
  ) =>
    request(`/v1/learn/${encodeURIComponent(nodeId)}`, LearnOutcome, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  practice: (nodeId: string) => request(`/v1/practice/${encodeURIComponent(nodeId)}`, PracticeSet),
  practiceResult: (answers: { pyqId: string; chosen: string | null }[], taskId?: string) =>
    request('/v1/practice', LearnOutcome, {
      method: 'POST',
      body: JSON.stringify({ answers, taskId }),
    }),
  dueCards: (nodeId?: string) =>
    request(`/v1/reviews/due${nodeId ? `?node=${encodeURIComponent(nodeId)}` : ''}`, DueCards),
  grade: (id: string, grade: 'again' | 'hard' | 'good' | 'easy') =>
    request(`/v1/reviews/${id}`, GradeResponse, {
      method: 'POST',
      body: JSON.stringify({ grade }),
    }),
  mistakes: () => request('/v1/mistakes', MistakeList),
  mistakeCause: (id: string, cause: string) =>
    request(`/v1/mistakes/${id}/cause`, null, { method: 'POST', body: JSON.stringify({ cause }) }),
  mastery: () => request('/v1/mastery', Heatmap),
  notifications: () => request('/v1/notifications', NotificationSettingsResponse),
  saveNotifications: (n: NotificationSettings) =>
    request('/v1/notifications', NotificationSettingsResponse, {
      method: 'PUT',
      body: JSON.stringify(n),
    }),
  subscribePush: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request('/v1/push/subscribe', null, { method: 'POST', body: JSON.stringify(sub) }),
  testPush: () => request('/v1/push/test', null, { method: 'POST' }),
  // Current affairs (Phase 5)
  caToday: () => request('/v1/ca/today', CaToday),
  caAnswers: (answers: { questionId: string; chosen: string | null }[], taskId?: string) =>
    request('/v1/ca/answers', CaResults, {
      method: 'POST',
      body: JSON.stringify({ answers, taskId }),
    }),
  caReport: (id: string, reason?: string) =>
    request(`/v1/ca/questions/${id}/report`, null, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  caShare: (url: string) =>
    request('/v1/ca/share', null, { method: 'POST', body: JSON.stringify({ url }) }),
  caForNode: (nodeId: string) => request(`/v1/ca/node/${encodeURIComponent(nodeId)}`, CaNodeItems),
  // Memory cues and coaching (Phase 6)
  cue: (nodeId: string, format?: CueFormatName) =>
    request(
      `/v1/cues/${encodeURIComponent(nodeId)}${format ? `?format=${format}` : ''}`,
      CueResponse,
    ),
  rateCue: (id: string, up: boolean) =>
    request(`/v1/cues/item/${id}/rate`, null, { method: 'POST', body: JSON.stringify({ up }) }),
  gradeCue: (id: string, text: string) =>
    request(`/v1/cues/item/${id}/grade`, RecallGrade, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  clozeCards: (id: string) => request(`/v1/cues/item/${id}/cards`, CardsAdded, { method: 'POST' }),
  cueAudio: (id: string) => request(`/v1/cues/item/${id}/audio`, LptAudio),
  playlist: () => request('/v1/cues/playlist', Playlist),
  palace: () => request('/v1/palace', Palace),
  savePalace: (p: { rooms: { name: string; loci: string[] }[] }) =>
    request('/v1/palace', Palace, { method: 'PUT', body: JSON.stringify(p) }),
  coach: () => request('/v1/coach', CoachState),
  noteRead: () => request('/v1/coach/note/read', null, { method: 'POST' }),
  checkIn: (level: 'light' | 'fine' | 'heavy') =>
    request('/v1/coach/checkin', CoachState.pick({ lighterWeek: true }), {
      method: 'POST',
      body: JSON.stringify({ level }),
    }),
  // Optional Discovery (Phase 7)
  optionals: () => request('/v1/optionals', OptionalList),
  optional: (slug: string) =>
    request(`/v1/optionals/item/${encodeURIComponent(slug)}`, OptionalExplorer),
  compareOptionals: (slugs: string[]) =>
    request(
      `/v1/optionals/compare?slugs=${slugs.map(encodeURIComponent).join(',')}`,
      OptionalCompare,
    ),
  fitQuiz: (q: FitQuiz) =>
    request('/v1/optionals/quiz', FitRanking, { method: 'POST', body: JSON.stringify(q) }),
  /** Re-opens the last ranking from the stored quiz answers; 404 before a quiz. */
  fits: () => request('/v1/optionals/fits', FitRanking),
  decision: () => request('/v1/optionals/status', DecisionStatus),
  askCoach: (question: string, slugs: string[]) =>
    request('/v1/optionals/coach', CoachReply, {
      method: 'POST',
      body: JSON.stringify({ question, slugs }),
    }),
  chooseOptional: (slug: string, reasons: string) =>
    request('/v1/optionals/choice', DecisionStatus, {
      method: 'POST',
      body: JSON.stringify({ slug, reasons }),
    }),
  transcribe: (audioBase64: string, seconds: number) =>
    request('/v1/speech/transcribe', TranscribeResponse, {
      method: 'POST',
      body: JSON.stringify({ audioBase64, seconds }),
    }),
};
