import PushSubscription from '../models/PushSubscription.js';
import {
  getVapidPublicKey,
  sendPushToAccount
} from '../services/push.service.js';

export async function getPushPublicKey(req, res) {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return res.status(503).json({
      message:
        'Push notifications are not configured on the server.'
    });
  }

  return res.json({
    publicKey
  });
}

export async function subscribeToPush(req, res) {
  const subscription = req.body;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return res.status(400).json({
      message: 'A valid push subscription is required.'
    });
  }

  const savedSubscription =
    await PushSubscription.findOneAndUpdate(
      {
        endpoint: subscription.endpoint
      },
      {
        $set: {
          account: req.account._id,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          },
          userAgent: req.get('user-agent') || '',
          enabled: true,
          lastUsedAt: new Date()
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

  return res.status(201).json({
    message: 'Push notifications enabled.',
    subscription: {
      id: savedSubscription._id,
      enabled: savedSubscription.enabled
    }
  });
}

export async function unsubscribeFromPush(req, res) {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({
      message: 'Subscription endpoint is required.'
    });
  }

  await PushSubscription.deleteOne({
    endpoint,
    account: req.account._id
  });

  return res.json({
    message: 'Push notifications disabled.'
  });
}

export async function getPushStatus(req, res) {
  const count = await PushSubscription.countDocuments({
    account: req.account._id,
    enabled: true
  });

  return res.json({
    enabled: count > 0,
    devices: count
  });
}

/*
 * Temporary development-only endpoint.
 * Remove this route or protect it more strictly after testing.
 */
export async function sendTestPush(req, res) {
  const result = await sendPushToAccount(
    req.account._id,
    {
      title: 'Essential Supermarket',
      body: 'Test notification successful.',
      url: '/alerts',
      tag: 'essential-test'
    }
  );

  return res.json({
    message: 'Test notification request completed.',
    ...result
  });
}