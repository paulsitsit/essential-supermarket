import ExpirationAlert from '../models/ExpirationAlert.js';
import ProductBatch from '../models/ProductBatch.js';

import {
  sendPushToAccount
} from './push.service.js';

const DEFAULT_ALERT_WINDOW_DAYS = 30;

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

  if (
    daysRemaining < 0 ||
    daysRemaining > alertWindowDays
  ) {
    await resolveBatchAlerts(
      batch._id,
      io,
      daysRemaining < 0
        ? 'batch_expired'
        : 'outside_alert_window'
    );

    return null;
  }

  const severity = getSeverity(daysRemaining);

  const existingAlert = await ExpirationAlert.findOne({
    batch: batch._id,
    status: {
      $ne: 'resolved'
    }
  });

  const alert = await ExpirationAlert.findOneAndUpdate(
    {
      batch: batch._id,
      status: {
        $ne: 'resolved'
      }
    },
    {
      $set: {
        product: batch.product,
        batchNumber: batch.batchNumber || '',
        quantity: batch.quantity,
        expirationDate: batch.expirationDate,
        daysRemaining,
        severity,
        updatedAt: new Date()
      },
      $setOnInsert: {
        batch: batch._id,
        status: 'unread',
        createdAt: new Date()
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  ).populate(
    'product',
    'name sku barcode currentStock reorderLevel status'
  );

  io?.emit('expirationAlertCreated', alert);

  if (!existingAlert) {
    try {
      const productName =
        alert.product?.name ||
        'A product';

      await sendPushToAccount(account?._id, {
        title:
          daysRemaining <= 0
            ? 'Product expires today'
            : 'Expiration alert',

        body:
          daysRemaining <= 0
            ? `${productName} expires today.`
            : `${productName} expires in ${
                daysRemaining
              } day${
                daysRemaining === 1 ? '' : 's'
              }.`,

        url: '/alerts',
        tag: `expiration-${batch._id.toString()}`
      });
    } catch (pushError) {
      console.error(
        'Expiration push notification failed:',
        pushError
      );
    }
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
 * Product-level expiration is no longer tracked, so it syncs any batches.
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