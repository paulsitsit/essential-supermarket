import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let configured = false;

function configureWebPush() {
  if (configured) {
    return true;
  }

  if (
    !vapidSubject ||
    !vapidPublicKey ||
    !vapidPrivateKey
  ) {
    console.warn(
      'Web push is disabled: VAPID environment variables are missing.'
    );

    return false;
  }

  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  configured = true;

  return true;
}

export function getVapidPublicKey() {
  return vapidPublicKey || '';
}

export async function sendPushToAccount(
  accountId,
  notification
) {
  if (!accountId || !configureWebPush()) {
    return {
      sent: 0,
      skipped: true
    };
  }

  const subscriptions =
    await PushSubscription.find({
      account: accountId,
      enabled: true
    });

  if (!subscriptions.length) {
    return {
      sent: 0,
      skipped: true
    };
  }

  const payload = JSON.stringify({
    title:
      notification.title ||
      'Essential Supermarket',
    body:
      notification.body ||
      'You have a new inventory alert.',
    url: notification.url || '/alerts',
    tag: notification.tag || 'inventory-alert',
    icon: notification.icon || '/pwa-192x192.png',
    badge: notification.badge || '/pwa-192x192.png',
    data: {
      url: notification.url || '/alerts'
    }
  });

  let sent = 0;

  await Promise.all(
    subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          payload,
          {
            TTL: 60 * 60 * 12
          }
        );

        subscription.lastUsedAt = new Date();
        await subscription.save();

        sent += 1;
      } catch (error) {
        const statusCode = error?.statusCode;

        console.error(
          'Push notification failed:',
          statusCode,
          error?.body || error?.message
        );

        /*
         * The push service returns 404/410 when the user
         * uninstalls the app, clears browser data, or revokes
         * notification permission. Remove invalid subscriptions.
         */
        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          await PushSubscription.deleteOne({
            _id: subscription._id
          });
        }
      }
    })
  );

  return {
    sent,
    skipped: false
  };
}