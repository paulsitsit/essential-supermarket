import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import StockLedgerEntry from '../models/StockLedgerEntry.js';
import ProductBatch from '../models/ProductBatch.js';
import LowStockAlert from '../models/LowStockAlert.js';
import Notification from '../models/Notification.js';
import Account from '../models/Account.js';

import { writeAudit } from '../utils/audit.js';

import {
  allocateBatchesFEFO,
  createReceivedBatch
} from './batch.service.js';

import {
  syncExpirationAlertsForProduct
} from './expirationAlert.service.js';

import {
  sendPushToAccount
} from './push.service.js';

function formatUnits(quantity) {
  const value = Number(quantity) || 0;

  return `${value} unit${value === 1 ? '' : 's'}`;
}

function isPositiveStockIncrease(
  movementType,
  quantityChanged
) {
  const increaseMovementTypes = [
    'stock_in',
    'stock_adjustment',
    'manual_correction'
  ];

  return (
    Number(quantityChanged) > 0 &&
    increaseMovementTypes.includes(movementType)
  );
}

export async function notifyStockAdded({
  product,
  movement,
  account,
  io
}) {
  const recipients = await Account.find({
    role: { $in: ['admin', 'manager'] },
    status: 'active'
  }).select('_id fullName role');

  if (!recipients.length) {
    console.warn(
      'Stock-added notification skipped: no active admin or manager accounts found.'
    );

    return {
      notifications: [],
      pushResults: []
    };
  }

  const quantityAdded = Number(
    movement.quantityChanged || 0
  );

  const currentStock = Number(
    movement.newStock ?? product.currentStock ?? 0
  );

  const title = 'Stock added';

  const message =
    `${product.name}: ${formatUnits(quantityAdded)} added. ` +
    `Current stock: ${formatUnits(currentStock)}.`;

  const notificationData = {
    event: 'stock_added',
    productId: product._id.toString(),
    productName: product.name,
    movementId: movement._id.toString(),
    movementType: movement.movementType,
    quantityAdded,
    previousStock: Number(movement.previousStock || 0),
    currentStock,
    branch: movement.branch || product.branch || 'Main Branch',
    addedBy: {
      id: account._id.toString(),
      fullName: account.fullName,
      role: account.role
    }
  };

  const notifications = await Notification.insertMany(
    recipients.map(recipient => ({
      account: recipient._id,
      type: 'stock_added',
      title,
      message,
      data: notificationData
    }))
  );

  const socketPayload = {
    type: 'stock_added',
    title,
    message,
    data: notificationData,
    createdAt: new Date().toISOString()
  };

  io?.emit('stockAdded', socketPayload);

  console.log('Stock-added notification created:', {
    product: product.name,
    movementType: movement.movementType,
    quantityAdded,
    currentStock,
    recipientCount: recipients.length
  });

  const pushResults = await Promise.allSettled(
    recipients.map(recipient =>
      sendPushToAccount(recipient._id, {
        title,
        body: message,
        url: '/inventory',
        tag: `stock-added-${movement._id.toString()}`
      })
    )
  );

  pushResults.forEach((result, index) => {
    const recipient = recipients[index];

    if (result.status === 'fulfilled') {
      console.log(
        `Stock-added push result for ${recipient.fullName}:`,
        result.value
      );
      return;
    }

    console.error(
      `Stock-added push notification failed for ${recipient.fullName}:`,
      result.reason
    );
  });

  return {
    notifications,
    pushResults
  };
}

/**
 * Keep low-stock alerts synchronized with the current product stock.
 *
 * - A product at or below its reorder level has an active alert.
 * - Zero stock is marked critical; positive low stock is a warning.
 * - When stock rises above the reorder level, all active alerts for that
 *   product are resolved and a socket event is sent to refresh the UI.
 */
export async function createOrUpdateAlert(
  product,
  account,
  req,
  io
) {
  const currentStock = Number(product.currentStock ?? 0);
  const reorderLevel = Number(product.reorderLevel ?? 0);

  const activeAlerts = await LowStockAlert.find({
    product: product._id,
    status: { $ne: 'resolved' }
  }).sort({ createdAt: 1 });

  // Stock recovered: resolve any stale active alert(s).
  if (currentStock > reorderLevel) {
    if (!activeAlerts.length) {
      return null;
    }

    const resolvedAt = new Date();
    const resolvedAlerts = [];

    for (const alert of activeAlerts) {
      alert.status = 'resolved';
      alert.resolvedAt = resolvedAt;
      await alert.save();
      resolvedAlerts.push(alert);

      io?.emit('lowStockAlertResolved', alert);
    }

    try {
      await writeAudit({
        req,
        account,
        action: 'low_stock_alert_auto_resolved',
        affectedRecord: product._id.toString(),
        metadata: {
          currentStock,
          reorderLevel,
          resolvedAlertIds: resolvedAlerts.map(
            alert => alert._id.toString()
          )
        }
      });
    } catch (auditError) {
      // A failed audit log must not undo stock recovery or alert resolution.
      console.error(
        'Unable to write automatic low-stock alert resolution audit:',
        auditError
      );
    }

    io?.emit('lowStockAlertUpdated', {
      product,
      currentStock,
      reorderLevel,
      status: 'resolved'
    });

    return null;
  }

  // Stock is at or below reorder level: update an active alert or create one.
  let alert = activeAlerts[0] || null;

  if (!alert) {
    alert = await LowStockAlert.create({
      product: product._id,
      currentStock,
      reorderLevel,
      severity: currentStock <= 0 ? 'critical' : 'warning',
      status: 'unread'
    });

    try {
      await writeAudit({
        req,
        account,
        action: 'low_stock_alert_created',
        affectedRecord: product._id.toString(),
        metadata: {
          currentStock,
          reorderLevel
        }
      });
    } catch (auditError) {
      // Do not block stock processing if audit logging fails.
      console.error(
        'Unable to write low-stock alert creation audit:',
        auditError
      );
    }

    io?.emit('lowStockAlertCreated', {
      product,
      alert
    });

    try {
      const isOutOfStock = currentStock <= 0;

      await sendPushToAccount(account?._id, {
        title: isOutOfStock
          ? 'Out of stock'
          : 'Low stock alert',
        body: isOutOfStock
          ? `${product.name} is out of stock.`
          : `${product.name} has only ${currentStock} unit${currentStock === 1 ? '' : 's'} remaining.`,
        url: '/alerts/low-stock',
        tag: `low-stock-${product._id.toString()}`
      });
    } catch (pushError) {
      console.error(
        'Low-stock push notification failed:',
        pushError
      );
    }
  } else {
    alert.currentStock = currentStock;
    alert.reorderLevel = reorderLevel;
    alert.severity = currentStock <= 0 ? 'critical' : 'warning';

    await alert.save();

    io?.emit('lowStockAlertUpdated', {
      product,
      alert
    });
  }

  // Repair any duplicate active alert records for the same product.
  // Keep the oldest active alert and resolve the extras.
  const duplicateAlerts = activeAlerts.slice(1);
  if (duplicateAlerts.length) {
    const resolvedAt = new Date();

    for (const duplicate of duplicateAlerts) {
      duplicate.status = 'resolved';
      duplicate.resolvedAt = resolvedAt;
      await duplicate.save();
      io?.emit('lowStockAlertResolved', duplicate);
    }
  }

  return alert;
}

/**
 * Create stock ledger entries for each batch allocation.
 * batchAllocations must include batchStockBefore and batchStockAfter
 * from allocateBatchesFEFO or createReceivedBatch.
 */
async function createBatchLedgerEntries({
  product,
  batchAllocations,
  movementType,
  reason,
  account,
  movement
}) {
  if (!batchAllocations || batchAllocations.length === 0) {
    return [];
  }

  const ledgerEntries = await Promise.all(
    batchAllocations.map(async (allocation) => {
      const batchStockBefore = allocation.batchStockBefore;
      const batchStockAfter = allocation.batchStockAfter;

      if (batchStockBefore === undefined || batchStockAfter === undefined) {
        console.warn(
          `Batch ${allocation.batch} missing stock before/after, skipping ledger entry`
        );
        return null;
      }

      const entry = await StockLedgerEntry.create({
        product: product._id,
        batch: allocation.batch,
        batchNumber: allocation.batchNumber || '',
        movementType,
        quantityChanged: allocation.movementType === 'stock_in'
          ? allocation.quantity
          : -allocation.quantity,
        batchStockBefore,
        batchStockAfter,
        reason,
        referenceType: movement.referenceType || 'manual',
        referenceId: movement.referenceId || null,
        performedBy: account._id,
        branch: product.branch || 'Main Branch'
      });

      return entry;
    })
  );

  return ledgerEntries.filter(entry => entry !== null);
}

export async function applyMovement({
  productId,
  account,
  movementType,
  quantityChanged,
  reason,
  expirationDate,
  batchNumber,
  receivedDate,
  req,
  io,
  referenceType = 'manual',
  referenceId = null
}) {
  const product = await Product.findById(productId);

  if (!product || product.isArchived) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const change = Number(quantityChanged);

  if (!Number.isFinite(change) || change === 0) {
    const error = new Error(
      'quantityChanged must be a non-zero number'
    );
    error.statusCode = 400;
    throw error;
  }

  const previousStock = Number(product.currentStock || 0);
  const newStock = previousStock + change;

  if (newStock < 0) {
    const error = new Error(
      'Stock cannot become negative'
    );
    error.statusCode = 409;
    throw error;
  }

  let batchAllocations = [];
  let receivedBatch = null;

  if (movementType === 'stock_in') {
    if (change <= 0) {
      const error = new Error(
        'Stock-in quantity must be greater than zero'
      );
      error.statusCode = 400;
      throw error;
    }

    receivedBatch = await createReceivedBatch({
      product,
      quantity: change,
      expirationDate,
      batchNumber,
      receivedDate,
      account
    });

    batchAllocations = [
      {
        batch: receivedBatch._id,
        batchNumber: receivedBatch.batchNumber || '',
        expirationDate: receivedBatch.expirationDate || null,
        quantity: change,
        movementType: 'stock_in',
        batchStockBefore: 0,
        batchStockAfter: change
      }
    ];
  } else if (change < 0) {
    // allocateBatchesFEFO must return batchStockBefore and batchStockAfter.
    batchAllocations = await allocateBatchesFEFO({
      product,
      quantity: Math.abs(change)
    });

    // Add movementType to each allocation for ledger creation.
    batchAllocations = batchAllocations.map(allocation => ({
      ...allocation,
      movementType
    }));
  }

  product.currentStock = newStock;
  await product.save();

  const movement = await StockMovement.create({
    product: product._id,
    account: account._id,
    movementType,
    quantityChanged: change,
    previousStock,
    newStock,
    reason,
    branch: product.branch,
    batchAllocations,
    referenceType,
    referenceId
  });

  // Create batch-level ledger entries.
  const ledgerEntries = await createBatchLedgerEntries({
    product,
    batchAllocations,
    movementType,
    reason,
    account,
    movement
  });

  await createOrUpdateAlert(
    product,
    account,
    req,
    io
  );

  await syncExpirationAlertsForProduct(
    product._id,
    account,
    req,
    io
  );

  io?.emit('stockUpdated', {
    product,
    movement
  });

  io?.emit('productUpdated', product);

  io?.emit('batchUpdated', {
    productId: product._id.toString(),
    receivedBatch,
    batchAllocations,
    ledgerEntries: ledgerEntries.map(e => e._id)
  });

  const shouldNotifyStockAdded =
    isPositiveStockIncrease(
      movementType,
      change
    );

  console.log('Stock movement notification check:', {
    product: product.name,
    movementType,
    quantityChanged: change,
    previousStock,
    newStock,
    shouldNotifyStockAdded,
    ledgerEntriesCreated: ledgerEntries.length
  });

  let stockAddedNotificationResult = null;

  if (shouldNotifyStockAdded) {
    try {
      stockAddedNotificationResult =
        await notifyStockAdded({
          product,
          movement,
          account,
          io
        });
    } catch (notificationError) {
      console.error(
        'Stock-added notification processing failed:',
        notificationError
      );
    }
  }

  await writeAudit({
    req,
    account,
    action: movementType,
    affectedRecord: product._id.toString(),
    metadata: {
      previousStock,
      newStock,
      quantityChanged: change,
      movementType,
      stockAddedNotificationTriggered:
        shouldNotifyStockAdded,
      ledgerEntriesCreated: ledgerEntries.length,
      batchAllocations: batchAllocations.map(
        allocation => ({
          batchId: allocation.batch.toString(),
          batchNumber: allocation.batchNumber,
          quantity: allocation.quantity,
          expirationDate: allocation.expirationDate,
          batchStockBefore: allocation.batchStockBefore,
          batchStockAfter: allocation.batchStockAfter
        })
      )
    }
  });

  return {
    product,
    movement,
    receivedBatch,
    batchAllocations,
    ledgerEntries,
    stockAddedNotifications:
      stockAddedNotificationResult
        ? stockAddedNotificationResult.notifications.length
        : 0
  };
}
