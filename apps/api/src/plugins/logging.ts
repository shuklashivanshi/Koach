import type { FastifyServerOptions } from 'fastify';

// Structured JSON shaped for Cloud Logging: `severity` and `message` fields, no auth headers.
export function loggerOptions(enabled: boolean): FastifyServerOptions['logger'] {
  if (!enabled) return false;
  return {
    messageKey: 'message',
    formatters: { level: (label) => ({ severity: label.toUpperCase() }) },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  };
}
