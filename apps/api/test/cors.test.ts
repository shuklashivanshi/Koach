import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers';

describe('CORS for the local web build', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;
  beforeEach(async () => {
    ctx = await buildTestApp();
  });
  afterEach(() => ctx.close());

  it('allows localhost origins in dev, including DELETE (account deletion)', async () => {
    const res = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/v1/me',
      headers: {
        origin: 'http://localhost:8081',
        'access-control-request-method': 'DELETE',
        'access-control-request-headers': 'authorization',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(res.headers['access-control-allow-methods']).toContain('DELETE');
    expect(res.headers['access-control-allow-methods']).toContain('PUT');
  });

  it('does not allow other origins', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
