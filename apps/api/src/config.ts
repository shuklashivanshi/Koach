import { z } from 'zod';

const ConfigSchema = z
  .object({
    APP_ENV: z.enum(['dev', 'prod']).default('dev'),
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    GCS_BUCKET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Koach <onboarding@resend.dev>'),
    // Dev-only escape hatch: also log sign-in codes so they can be tested without a mailbox.
    EMAIL_DEV_ECHO: z.enum(['0', '1']).default('0'),
    K_REVISION: z.string().optional(),
    /** Comma-separated emails allowed to use the admin review tools (KB-07). */
    ADMIN_EMAILS: z
      .string()
      .default('')
      .transform((v) =>
        v
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
  })
  .superRefine((c, ctx) => {
    if (c.APP_ENV === 'prod' && c.EMAIL_DEV_ECHO === '1') {
      ctx.addIssue({ code: 'custom', message: 'EMAIL_DEV_ECHO must not be enabled in prod' });
    }
    if (c.APP_ENV === 'prod') {
      for (const key of [
        'DATABASE_URL',
        'FIREBASE_PROJECT_ID',
        'GCS_BUCKET',
        'RESEND_API_KEY',
      ] as const) {
        if (!c[key]) ctx.addIssue({ code: 'custom', message: `${key} is required in prod` });
      }
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid configuration: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  return parsed.data;
}
