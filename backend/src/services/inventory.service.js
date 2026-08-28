import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
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

export async function createOrUpdateAlert(
  product,
  account,
  req,
  io
) {
  if (product.currentStock <= product.reorderLevel) {
    let alert = await LowStockAlert.findOne({
      product: product._id,
      status: {
        $ne: 'resolved'
      }
    });

    if (!alert) {
      alert = await LowStockAlert.create({
        product: product._id,
        currentStock: product.currentStock,
        reorderLevel: product.reorderLevel,
        severity:
          product.currentStock === 0
            ? 'critical'
            : 'warning',
        status: 'unread'
      });

      await writeAudit({
        req,
        account,
        action: 'low_stock_alert_created',
        affectedRecord: product._id.toString(),
        metadata: {
          currentStock: product.currentStock,
          reorderLevel: product.reorderLevel
        }
      });

      io?.emit('lowStockAlertCreated', {
        product,
        alert
      });

      try {
        const isOutOfStock =
          Number(product.currentStock || 0) === 0;

        await sendPushToAccount(account?._id, {
          title: isOutOfStock
            ? 'Out of stock'
            : 'Low stock alert',

          body: isOutOfStock
            ? `${product.name} is out of stock.`
            : `${product.name} has only ${
                product.currentStock
              } unit${
                Number(product.currentStock) === 1
                  ? ''
                  : 's'
              } remaining.`,

          url: '/alerts',
          tag: `low-stock-${product._id.toString()}`
        });
      } catch (pushError) {
        console.error(
          'Low-stock push notification failed:',
          pushError
        );
      }
    } else {
      alert.currentStock = product.currentStock;
      alert.reorderLevel = product.reorderLevel;
      alert.severity =
        product.currentStock === 0
          ? 'critical'
          : 'warning';

      await alert.save();

      io?.emit('productUpdated', {
        product,
        alert
      });
    }

    return alert;
  }

  return null;
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
  io
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
        batchNumber:
          receivedBatch.batchNumber || '',
        expirationDate:
          receivedBatch.expirationDate || null,
        quantity: change
      }
    ];
  } else if (change < 0) {
    /*
     * Stock deductions use FEFO:
     * nearest expiration date first,
     * then oldest received batch.
     */
    batchAllocations = await allocateBatchesFEFO({
      product,
      quantity: Math.abs(change)
    });
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
    batchAllocations
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
    batchAllocations
  });

  await writeAudit({
    req,
    account,
    action: movementType,
    affectedRecord: product._id.toString(),
    metadata: {
      previousStock,
      newStock,
      quantityChanged: change,
      batchAllocations: batchAllocations.map(
        allocation => ({
          batchId: allocation.batch.toString(),
          batchNumber: allocation.batchNumber,
          quantity: allocation.quantity,
          expirationDate: allocation.expirationDate
        })
      )
    }
  });

  return {
    product,
    movement,
    receivedBatch,
    batchAllocations
  };
}