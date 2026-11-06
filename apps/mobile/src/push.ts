// Native build: push arrives with the phone build (FCM). Web is in push.web.ts.
export const canPush = false;
export function enablePush(
  _publicKey: string,
): Promise<{ endpoint: string; keys: { p256dh: string; auth: string } } | null> {
  return Promise.resolve(null);
}
