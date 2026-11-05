import { ApiError, api, setUnauthorizedHandler } from '@/api/client';
import { currentIdToken } from '@/auth/firebase';

jest.mock('@/auth/firebase', () => ({ currentIdToken: jest.fn() }));

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  mockFetch.mockReset();
  (currentIdToken as jest.Mock).mockResolvedValue('id-token-1');
});

test('sends the ID token and parses the response with the shared schema', async () => {
  mockFetch.mockReturnValue(
    json(200, { uid: 'u1', email: null, createdAt: '2026-11-06T10:00:00.000Z' }),
  );
  const me = await api.me();
  expect(me.uid).toBe('u1');
  const [url, init] = mockFetch.mock.calls[0];
  expect(url).toBe('https://api.test/v1/me');
  expect(init.headers.Authorization).toBe('Bearer id-token-1');
});

test('omits Authorization when signed out', async () => {
  (currentIdToken as jest.Mock).mockResolvedValue(null);
  mockFetch.mockReturnValue(json(200, { ok: true, version: 'v' }));
  await api.health();
  expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test('maps API errors to ApiError with the server code', async () => {
  mockFetch.mockReturnValue(json(400, { error: 'invalid_code' }));
  await expect(api.emailVerify('a@b.co', '123456')).rejects.toMatchObject({
    status: 400,
    code: 'invalid_code',
  });
});

test('maps network failures to ApiError(network)', async () => {
  mockFetch.mockRejectedValue(new TypeError('Network request failed'));
  await expect(api.health()).rejects.toEqual(new ApiError(0, 'network'));
});

test('a 401 triggers the unauthorized handler', async () => {
  const handler = jest.fn();
  setUnauthorizedHandler(handler);
  mockFetch.mockReturnValue(json(401, { error: 'unauthorized' }));
  await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  expect(handler).toHaveBeenCalledTimes(1);
});

test('rejects responses that break the contract', async () => {
  mockFetch.mockReturnValue(json(200, { uid: 42 }));
  await expect(api.me()).rejects.toThrow();
});
