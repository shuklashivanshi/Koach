import {
  AiPingResponse,
  ApiErrorBody,
  EmailVerifyResponse,
  ExportBundleSchema,
  HealthResponse,
  MeSchema,
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
  health: () => request('/healthz', HealthResponse),
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
};
