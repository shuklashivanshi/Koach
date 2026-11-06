import webpush from 'web-push';

// Push delivery behind an interface: Web Push now, FCM for the phone build later (D-01).

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}
export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
export interface PushSender {
  /** Resolves "gone" when the subscription no longer exists and should be deleted. */
  send(target: PushTarget, message: PushMessage): Promise<'sent' | 'gone'>;
}

export function webPushSender(publicKey: string, privateKey: string, subject: string): PushSender {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return {
    async send(target, message) {
      try {
        await webpush.sendNotification(target, JSON.stringify(message), { TTL: 3600 });
        return 'sent';
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return 'gone';
        throw err;
      }
    },
  };
}

export function recordingPush(): PushSender & {
  sent: { target: PushTarget; message: PushMessage }[];
} {
  const sent: { target: PushTarget; message: PushMessage }[] = [];
  return {
    sent,
    send(target, message) {
      sent.push({ target, message });
      return Promise.resolve('sent');
    },
  };
}
