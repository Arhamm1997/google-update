/**
 * lib/vapid.ts — VAPID key management for Web Push notifications.
 *
 * Web Push requires a VAPID key pair:
 *   - Private key: stays on the server, signs push messages
 *   - Public key:  sent to the browser when creating a push subscription
 *
 * Setup (run once, then copy values into .env.local):
 *
 *   node -e "
 *     const { generateVAPIDKeys } = require('web-push');
 *     const keys = generateVAPIDKeys();
 *     console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
 *     console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
 *   "
 *
 * Then add both to .env.local.
 *
 * npm i web-push @types/web-push
 */

export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    // Return empty string — callers check before using
    return '';
  }
  return key;
}

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: object
): Promise<void> {
  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:admin@yourdomain.com';

  if (!publicKey || !privateKey) {
    console.warn('[vapid] VAPID keys not set — skipping push notification');
    return;
  }

  const webpush = await import('web-push');
  webpush.setVapidDetails(subject, publicKey, privateKey);

  await webpush.sendNotification(
    subscription as Parameters<typeof webpush.sendNotification>[0],
    JSON.stringify(payload)
  );
}
