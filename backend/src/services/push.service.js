import webpush from 'web-push';

import PushSubscription from '../models/PushSubscription.js';
import FcmDevice from '../models/FcmDevice.js';

import {
  getFirebaseMessaging
} from './firebase.service.js';

const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let webPushConfigured = false;

function configureWebPush() {
  if (webPushConfigured) {
    return true;
  }

  if (
    !vapidSubject ||
    !vapidPublicKey ||
    !vapidPrivateKey
  ) {
    return false;
  }

  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  webPushConfigured = true;

  return true;
}

export function getVapidPublicKey() {
  return vapidPublicKey || '';
}

function createWebPushPayload(notification) {
  return JSON.stringify({
    title:
      notification.title ||
      'Essential Supermarket',

    body:
      notification.body ||
      'You have a new inventory alert.',

    url: notification.url || '/alerts',

    tag: notification.tag || 'inventory-alert',

    icon:
      notification.icon ||
      '/pwa-192x192.png',

    badge:
      notification.badge ||
      '/pwa-192x192.png',

    data: {
      url: notification.url || '/alerts'
    }
  });
}

async function sendBrowserPushes(
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
      skipped: false
    };
  }

  const payload =
    createWebPushPayload(notification);

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
          'Browser push notification failed:',
          statusCode,
          error?.body || error?.message
        );

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

async function sendFcmPushes(
  accountId,
  notification
) {
  if (!accountId) {
    return {
      sent: 0,
      skipped: true
    };
  }

  const messaging = getFirebaseMessaging();

  if (!messaging) {
    return {
      sent: 0,
      skipped: true
    };
  }

  const devices = await FcmDevice.find({
    account: accountId,
    enabled: true
  });

  if (!devices.length) {
    return {
      sent: 0,
      skipped: false
    };
  }

  let sent = 0;

  await Promise.all(
    devices.map(async device => {
      try {
        await messaging.send({
          token: device.token,

          notification: {
            title:
              notification.title ||
              'Essential Supermarket',

            body:
              notification.body ||
              'You have a new inventory alert.'
          },

          data: {
            url: String(
              notification.url || '/alerts'
            ),
            tag: String(
              notification.tag || 'inventory-alert'
            )
          },

          android: {
            priority: 'high',
            notification: {
              channelId: 'inventory-alerts',
              sound: 'default'
            }
          }
        });

        device.lastUsedAt = new Date();
        await device.save();

        sent += 1;
      } catch (error) {
        const code = error?.code || '';

        console.error(
          'FCM notification failed:',
          code,
          error?.message
        );

        if (
          code ===
            'messaging/registration-token-not-registered' ||
          code ===
            'messaging/invalid-registration-token'
        ) {
          await FcmDevice.deleteOne({
            _id: device._id
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

export async function sendPushToAccount(
  accountId,
  notification
) {
  const [
    browser,
    android
  ] = await Promise.all([
    sendBrowserPushes(
      accountId,
      notification
    ),

    sendFcmPushes(
      accountId,
      notification
    )
  ]);

  return {
    sent: browser.sent + android.sent,

    browserSent: browser.sent,
    androidSent: android.sent,

    skipped:
      browser.skipped &&
      android.skipped
  };
}