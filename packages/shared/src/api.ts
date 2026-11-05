import { z } from 'zod';

// Single source of truth for the HTTP contract between apps/api and apps/mobile.

export const MeSchema = z.object({
  uid: z.string().min(1),
  email: z.email().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type Me = z.infer<typeof MeSchema>;

export const EmailStartRequest = z.object({
  email: z.email().max(254),
});
export type EmailStartRequest = z.infer<typeof EmailStartRequest>;

export const EmailVerifyRequest = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/),
});
export type EmailVerifyRequest = z.infer<typeof EmailVerifyRequest>;

export const EmailVerifyResponse = z.object({
  customToken: z.string().min(1),
});
export type EmailVerifyResponse = z.infer<typeof EmailVerifyResponse>;

export const AiCallRecord = z.object({
  id: z.string(),
  feature: z.string(),
  model: z.string(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  chars: z.number().int(),
  estCostUsd: z.number(),
  latencyMs: z.number().int(),
  createdAt: z.iso.datetime({ offset: true }),
});

export const ExportBundleSchema = z.object({
  exportedAt: z.iso.datetime({ offset: true }),
  user: MeSchema,
  emailCodes: z.array(
    z.object({
      createdAt: z.iso.datetime({ offset: true }),
      expiresAt: z.iso.datetime({ offset: true }),
    }),
  ),
  aiCalls: z.array(AiCallRecord),
  storageObjects: z.array(z.string()),
});
export type ExportBundle = z.infer<typeof ExportBundleSchema>;

export const AiPingResponse = z.object({
  text: z.string(),
  audioBase64: z.string(),
  model: z.string(),
  costUsd: z.number(),
});
export type AiPingResponse = z.infer<typeof AiPingResponse>;

export const HealthResponse = z.object({
  ok: z.literal(true),
  version: z.string(),
});

export const ApiErrorBody = z.object({
  error: z.enum([
    'unauthorized',
    'too_many_requests',
    'invalid_code',
    'bad_request',
    'not_found',
    'internal',
  ]),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
