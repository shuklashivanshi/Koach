// Web build: register the service worker and subscribe to Web Push with the API's VAPID key.
export const canPush =
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof PushManager !== 'undefined';

const toBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function enablePush(publicKey: string) {
  if (!canPush) return null;
  if ((await Notification.requestPermission()) !== 'granted') return null;
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toBytes(publicKey),
    }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return { endpoint: json.endpoint, keys: json.keys };
}
