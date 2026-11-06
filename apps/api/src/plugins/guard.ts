import { findHits, scrub } from '@koach/guard';
import type { FastifyInstance } from 'fastify';

/**
 * Naming rule (KB-08): every JSON response is checked for blocked names before it leaves the API.
 * Outside prod a hit is a bug and fails loudly (500); in prod the names are redacted and logged so
 * the learner still gets their content.
 */
export function registerNamingGuard(app: FastifyInstance, mode: 'fail' | 'redact'): void {
  app.addHook('onSend', (request, reply, payload, done) => {
    const type = String(reply.getHeader('content-type') ?? '');
    if (
      typeof payload !== 'string' ||
      !type.includes('application/json') ||
      request.url.startsWith('/docs')
    ) {
      done(null, payload);
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      done(null, payload);
      return;
    }
    const hits = findHits(body);
    if (!hits.length) {
      done(null, payload);
      return;
    }
    request.log.error({ hits, url: request.url }, 'blocked_name_in_response');
    if (mode === 'redact') {
      done(null, JSON.stringify(scrub(body)));
      return;
    }
    reply.code(500);
    done(null, JSON.stringify({ error: 'internal' }));
  });
}
