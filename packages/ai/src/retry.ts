const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const e = err as { status?: unknown; code?: unknown };
  if (typeof e.status === 'number') return e.status;
  if (typeof e.code === 'number') return e.code;
  return undefined;
}

/** Retries transient Vertex errors (429/5xx) with jittered exponential backoff, max 3 attempts. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 3,
    baseMs = 300,
    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  } = {},
): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = statusOf(err);
      if (i >= attempts || status === undefined || !RETRYABLE.has(status)) throw err;
      await sleep(baseMs * 2 ** (i - 1) * (0.5 + Math.random()));
    }
  }
}
