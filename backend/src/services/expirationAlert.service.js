import ExpirationAlert from '../models/ExpirationAlert.js';
import ProductBatch from '../models/ProductBatch.js';
import Account from '../models/Account.js';

import {
  sendPushToAccount
} from './push.service.js';

/*
 * This controls the in-app expiry-alert window.
 *
 * Environment override:
 * EXPIRATION_ALERT_DAYS=30
 */
const DEFAULT_ALERT_WINDOW_DAYS = 30;

/*
 * Push notifications are sent only on these exact calendar-day
 * milestones. The scheduler still runs every day to update alert
 * daysRemaining and severity.
 *
 * -1 means "first day expired", i.e. the morning after the
 * expiration date.
 */
const EXPIRATION_PUSH_MILESTONES = [
  30,
  14,
  7,
  3,
  0,
  -1
];

function getAlertWindowDays() {
  const value = Number(
    process.env.EXPIRATION_ALERT_DAYS ||
      DEFAULT_ALERT_WINDOW_DAYS
  );

  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_ALERT_WINDOW_DAYS;
}

function startOfDay(value) {
  const date = new Date(value);

  date.setHours(0, 0, 0, 0);

  return date;
}

function getDaysRemaining(expirationDate) {
  const today = startOfDay(new Date());
  const expiration = startOfDay(expirationDate);

  return Math.ceil(
    (expiration.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function getSeverity(daysRemaining) {
  if (daysRemaining <= 3) {
    return 'critical';
  }

  if (daysRemaining <= 7) {
    return 'warning';
  }

  return 'info';
}

function isPushMilestone(daysRemaining) {
  return EXPIRATION_PUSH_MILESTONES.includes(
    daysRemaining
  );
}

function getMilestoneNotification(daysRemaining, productName) {
  const name = productName || 'A product';

  if (daysRemaining === 30) {
    return {
      title: 'Expiration alert: 30 days remaining',
      body: `${name} expires in 30 days. Review stock rotation and promotion options.`
    };
  }

  if (daysRemaining === 14) {
    return {
      title: 'Expiration alert: 2 weeks remaining',
      body: `${name} expires in 14 days. Prioritize FEFO rotation and review sell-through.`
    };
  }

  if (daysRemaining === 7) {
    return {
      title: 'Expiration warning: 7 days remaining',
      body: `${name} expires in 7 days. Consider a markdown or priority shelf placement.`
    };
  }

  if (daysRemaining === 3) {
    return {
      title: 'Critical expiration alert: 3 days remaining',
      body: `${name} expires in 3 days. Take immediate sell-through or disposal-preparation action.`
    };
  }

  if (daysRemaining === 0) {
    return {
      title: 'Product expires today',
      body: `${name} expires today. Review the batch before further sale or prepare a write-off.`
    };
  }

  return {
    title: 'Product expired: action required',
    body: `${name} expired yesterday. Remove it from sellable stock and process quarantine, disposal, or return-to-supplier.`
  };
}

async function getExpirationNotificationRecipients() {
  return Account.find({
    role: {
      $in: ['admin', 'manager']
    },
    status: 'active'
  }).select('_id fullName role');
}

async function sendExpirationMilestonePushes({
  alert,
  daysRemaining
}) {
  if (!isPushMilestone(daysRemaining)) {
    return {
      sent: false,
      recipientCount: 0,
      results: []
    };
  }

  const alreadySent = (
    alert.notificationMilestones || []
  ).includes(daysRemaining);

  if (alreadySent) {
    return {
      sent: false,
      alreadySent: true,
      recipientCount: 0,
      results: []
    };
  }

  const recipients =
    await getExpirationNotificationRecipients();

  const productName =
    alert.product?.name ||
    'A product';

  const notification =
    getMilestoneNotification(
      daysRemaining,
      productName
    );

  const pushPayload = {
    ...notification,
    url: '/alerts',
    tag: `expiration-${alert.batch.toString()}-${daysRemaining}`
  };

  const results = await Promise.allSettled(
    recipients.map(recipient =>
      sendPushToAccount(
        recipient._id,
        pushPayload
      )
    )
  );

  /*
   * Mark the milestone as processed even if no device subscription
   * exists. This prevents duplicate notifications when the app/job
   * restarts. New device subscriptions will receive future milestones.
   */
  alert.notificationMilestones = [
    ...(alert.notificationMilestones || []),
    daysRemaining
  ];

  alert.lastNotificationAt = new Date();

  await alert.save();

  const fulfilled = results.filter(
    result => result.status === 'fulfilled'
  ).length;

  const rejected = results.filter(
    result => result.status === 'rejected'
  );

  rejected.forEach(result => {
    console.error(
      'Expiration milestone push failed:',
      result.reason
    );
  });

  return {
    sent: true,
    alreadySent: false,
    recipientCount: recipients.length,
    fulfilled,
    rejected: rejected.length,
    results
  };
}

async function resolveBatchAlerts(
  batchId,
  io,
  reason = 'batch_alert_resolved'
) {
  const resolvedAt = new Date();

  const result = await ExpirationAlert.updateMany(
    {
      batch: batchId,
      status: {
        $ne: 'resolved'
      }
    },
    {
      $set: {
        status: 'resolved',
        resolvedAt
      }
    }
  );

  if (result.modifiedCount > 0) {
    io?.emit('expirationAlertResolved', {
      batchId: batchId.toString(),
      resolvedAt,
      reason
    });
  }

  return result;
}

async function findOrCreateActiveAlert(batch) {
  const existingAlert = await ExpirationAlert.findOne({
    batch: batch._id,
    status: {
      $ne: 'resolved'
    }
  }).populate(
    'product',
    'name sku barcode currentStock reorderLevel status'
  );

  if (existingAlert) {
    return {
      alert: existingAlert,
      wasCreated: false
    };
  }

  const alert = await ExpirationAlert.create({
    product: batch.product,
    batch: batch._id,
    batchNumber: batch.batchNumber || '',
    quantity: batch.quantity,
    expirationDate: batch.expirationDate,
    daysRemaining: getDaysRemaining(
      batch.expirationDate
    ),
    severity: getSeverity(
      getDaysRemaining(batch.expirationDate)
    ),
    status: 'unread',
    notificationMilestones: []
  });

  await alert.populate(
    'product',
    'name sku barcode currentStock reorderLevel status'
  );

  return {
    alert,
    wasCreated: true
  };
}

export async function syncExpirationAlertForBatch(
  batch,
  account,
  req,
  io
) {
  if (!batch?._id) {
    return null;
  }

  if (
    !batch.expirationDate ||
    Number(batch.quantity || 0) <= 0
  ) {
    await resolveBatchAlerts(
      batch._id,
      io,
      !batch.expirationDate
        ? 'batch_has_no_expiration_date'
        : 'batch_depleted'
    );

    return null;
  }

  const daysRemaining = getDaysRemaining(
    batch.expirationDate
  );

  const alertWindowDays = getAlertWindowDays();

  /*
   * More than the configured window: no active expiration alert.
   */
  if (daysRemaining > alertWindowDays) {
    await resolveBatchAlerts(
      batch._id,
      io,
      'outside_alert_window'
    );

    return null;
  }

  /*
   * After the first expired day, resolve the standard expiring-soon
   * alert. The -1-day notification has already had its chance to
   * run. Quarantine/disposal workflows handle physically expired
   * stock after that.
   */
  if (daysRemaining < -1) {
    await resolveBatchAlerts(
      batch._id,
      io,
      'batch_expired'
    );

    return null;
  }

  /*
   * At -1, 0, and the active expiry window, find/create the alert.
   */
  const { alert } =
    await findOrCreateActiveAlert(batch);

  alert.product = batch.product;
  alert.batchNumber = batch.batchNumber || '';
  alert.quantity = batch.quantity;
  alert.expirationDate = batch.expirationDate;
  alert.daysRemaining = daysRemaining;
  alert.severity = getSeverity(daysRemaining);

  /*
   * Never change status from "read" back to "unread".
   * The alert remains open until it is resolved/depleted/expired.
   */
  if (alert.status === 'resolved') {
    alert.status = 'unread';
    alert.resolvedAt = null;
    alert.resolvedBy = null;
  }

  await alert.save();

  await alert.populate(
    'product',
    'name sku barcode currentStock reorderLevel status'
  );

  io?.emit('expirationAlertCreated', alert);

  /*
   * Send only when the batch is exactly at a milestone and that
   * milestone is not already recorded in MongoDB.
   */
  try {
    await sendExpirationMilestonePushes({
      alert,
      daysRemaining
    });
  } catch (pushError) {
    /*
     * Do not stop stock operations or the daily job because a push
     * provider/device fails. The in-app alert remains available.
     */
    console.error(
      'Expiration milestone push processing failed:',
      pushError
    );
  }

  /*
   * The -1 notification is delivered first. Then resolve the normal
   * expiring-soon alert so the regular alert page is not permanently
   * filled with already expired batches.
   */
  if (daysRemaining === -1) {
    await resolveBatchAlerts(
      batch._id,
      io,
      'expired_notification_sent'
    );
  }

  return alert;
}

export async function syncExpirationAlertsForProduct(
  productId,
  account,
  req,
  io
) {
  const batches = await ProductBatch.find({
    product: productId
  });

  const activeBatchIds = new Set(
    batches.map(batch => batch._id.toString())
  );

  const existingAlerts = await ExpirationAlert.find({
    product: productId,
    status: {
      $ne: 'resolved'
    }
  });

  for (const alert of existingAlerts) {
    if (
      !alert.batch ||
      !activeBatchIds.has(alert.batch.toString())
    ) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();

      await alert.save();
    }
  }

  const results = [];

  for (const batch of batches) {
    const alert = await syncExpirationAlertForBatch(
      batch,
      account,
      req,
      io
    );

    if (alert) {
      results.push(alert);
    }
  }

  return results;
}

/*
 * Used by the scheduled job. It scans all active batches in one pass.
 *
 * account and req are intentionally null because this is a system
 * task rather than an action performed by a logged-in person.
 */
export async function runDailyExpirationAlertSync(io) {
  const batches = await ProductBatch.find({
    quantity: {
      $gt: 0
    },
    expirationDate: {
      $ne: null
    }
  });

  const summary = {
    scanned: batches.length,
    alertsProcessed: 0,
    failures: 0,
    startedAt: new Date(),
    completedAt: null
  };

  for (const batch of batches) {
    try {
      const alert =
        await syncExpirationAlertForBatch(
          batch,
          null,
          null,
          io
        );

      if (alert) {
        summary.alertsProcessed += 1;
      }
    } catch (error) {
      summary.failures += 1;

      console.error(
        'Daily expiration sync failed for batch:',
        batch._id.toString(),
        error
      );
    }
  }

  summary.completedAt = new Date();

  console.log('Daily expiration alert sync completed:', {
    scanned: summary.scanned,
    alertsProcessed: summary.alertsProcessed,
    failures: summary.failures,
    startedAt: summary.startedAt.toISOString(),
    completedAt: summary.completedAt.toISOString()
  });

  return summary;
}

export async function resolveExpirationAlert(
  productId,
  account,
  req,
  io
) {
  const result = await ExpirationAlert.updateMany(
    {
      product: productId,
      status: {
        $ne: 'resolved'
      }
    },
    {
      $set: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: account?._id || null
      }
    }
  );

  if (result.modifiedCount > 0) {
    io?.emit('expirationAlertResolved', {
      productId: productId.toString(),
      reason: 'manual_product_resolution'
    });
  }

  return result;
}

/*
 * Compatibility export:
 * Existing product controller calls this after create/update.
 */
export async function createOrUpdateExpirationAlert(
  product,
  account,
  req,
  io
) {
  if (!product?._id) {
    return null;
  }

  const alerts = await syncExpirationAlertsForProduct(
    product._id,
    account,
    req,
    io
  );

  return alerts[0] || null;
}