import { Router } from 'express';

import {
  getPushPublicKey,
  getPushStatus,
  registerFcmDevice,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush
} from '../controllers/push.controller.js';

import {
  protect
} from '../middleware/auth.js';

const router = Router();

/*
 * The VAPID public key is safe for the frontend to retrieve.
 * It is required before the browser can subscribe to push.
 */
router.get(
  '/public-key',
  getPushPublicKey
);

/*
 * A logged-in user is required for all device subscription
 * actions because each device subscription is tied to an
 * account in MongoDB.
 */
router.get(
  '/status',
  protect,
  getPushStatus
);

router.post(
  '/subscribe',
  protect,
  subscribeToPush
);

router.post(
  '/unsubscribe',
  protect,
  unsubscribeFromPush
);

router.post(
  '/fcm/register',
  protect,
  registerFcmDevice
);

/*
 * Testing route:
 * sends a push notification to the current account's
 * subscribed device(s).
 */
router.post(
  '/test',
  protect,
  sendTestPush
);

export default router;