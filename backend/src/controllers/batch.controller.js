import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import StockMovement from '../models/StockMovement.js';

import { writeAudit } from '../utils/audit.js';

import {
  createBatchNumber,
  normalizeExpirationDate
} from '../services/batch.service.js';

import {
  syncExpirationAlertForBatch
} from '../services/expirationAlert.service.js';

import {
  createOrUpdateAlert,
  notifyStockAdded
} from '../services/inventory.service.js';

export async function getBatchesByBarcode(req, res) {
  const barcode = String(req.params.barcode || '')
    .trim()
    .toUpperCase();

  if (!barcode) {
    return res.status(400).json({
      message: 'A barcode is required'
    });
  }

  const product = await Product.findOne({
    barcode,
    isArchived: false
  }).populate('category supplier', 'name');

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const batches = await ProductBatch.find({
    product: product._id,
    quantity: { $gt: 0 }
  }).sort({
    expirationDate: 1,
    receivedDate: 1,
    createdAt: 1
  });

  res.json({
    product,
    batches
  });
}

export async function getBatchesByProductId(req, res) {
  const product = await Product.findById(
    req.params.productId
  ).populate('category supplier', 'name');

  if (!product || product.isArchived) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const batches = await ProductBatch.find({
    product: product._id,
    quantity: { $gt: 0 }
  }).sort({
    expirationDate: 1,
    receivedDate: 1,
    createdAt: 1
  });

  res.json({
    product,
    batches
  });
}

export async function receiveStockBatch(req, res) {
  const {
    barcode,
    productId,
    quantity,
    expirationDate,
    batchNumber,
    receivedDate,
    reason = 'Stock received'
  } = req.body;

  let product = null;

  if (productId) {
    product = await Product.findById(productId);
  } else if (barcode) {
    product = await Product.findOne({
      barcode: String(barcode).trim().toUpperCase()
    });
  }

  if (!product || product.isArchived) {
    return res.status(404).json({
      message:
        'Product not found. Create the product before receiving stock.'
    });
  }

  const receivedQuantity = Number(quantity);

  if (
    !Number.isFinite(receivedQuantity) ||
    receivedQuantity <= 0
  ) {
    return res.status(400).json({
      message: 'Received quantity must be greater than zero'
    });
  }

  const safeBatchNumber =
    String(batchNumber || '').trim() ||
    createBatchNumber(product);

  const existingBatch = await ProductBatch.findOne({
    product: product._id,
    batchNumber: safeBatchNumber
  });

  if (existingBatch) {
    return res.status(409).json({
      message:
        'This batch number already exists for the product'
    });
  }

  const normalizedExpiration =
    normalizeExpirationDate(expirationDate);

  const receivedAt = receivedDate
    ? new Date(receivedDate)
    : new Date();

  if (Number.isNaN(receivedAt.getTime())) {
    return res.status(400).json({
      message: 'Invalid received date'
    });
  }

  const previousStock = Number(product.currentStock || 0);

  const batch = await ProductBatch.create({
    product: product._id,
    barcode: product.barcode,
    expirationDate: normalizedExpiration,
    quantity: receivedQuantity,
    receivedDate: receivedAt,
    batchNumber: safeBatchNumber,
    branch: product.branch,
    createdBy: req.account._id
  });

  product.currentStock = previousStock + receivedQuantity;
  await product.save();

  const movement = await StockMovement.create({
    product: product._id,
    account: req.account._id,
    movementType: 'stock_in',
    quantityChanged: receivedQuantity,
    previousStock,
    newStock: product.currentStock,
    reason,
    branch: product.branch,
    batchAllocations: [
      {
        batch: batch._id,
        batchNumber: batch.batchNumber,
        expirationDate: batch.expirationDate,
        quantity: receivedQuantity
      }
    ]
  });

  const io = req.app.get('io');

  await createOrUpdateAlert(
    product,
    req.account,
    req,
    io
  );

  await syncExpirationAlertForBatch(
    batch,
    req.account,
    req,
    io
  );

  try {
    await notifyStockAdded({
      product,
      movement,
      account: req.account,
      io
    });
  } catch (notificationError) {
    console.error(
      'Stock-added notification processing failed after batch receive:',
      notificationError
    );
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'batch_received',
    affectedRecord: batch._id.toString(),
    metadata: {
      productId: product._id.toString(),
      barcode: product.barcode,
      quantity: receivedQuantity,
      batchNumber: batch.batchNumber,
      expirationDate: batch.expirationDate
    }
  });

  io?.emit('stockUpdated', {
    product,
    movement
  });

  io?.emit('productUpdated', product);

  io?.emit('batchUpdated', {
    productId: product._id.toString(),
    batch
  });

  res.status(201).json({
    message: 'Stock batch received',
    product,
    batch,
    movement
  });
}

export async function updateBatch(req, res) {
  const batch = await ProductBatch.findById(req.params.id);

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const updates = {};

  if (req.body.expirationDate !== undefined) {
    updates.expirationDate = normalizeExpirationDate(
      req.body.expirationDate
    );
  }

  if (req.body.batchNumber !== undefined) {
    const value = String(
      req.body.batchNumber || ''
    ).trim();

    if (!value) {
      return res.status(400).json({
        message: 'Batch number cannot be empty'
      });
    }

    updates.batchNumber = value;
  }

  if (req.body.receivedDate !== undefined) {
    const receivedDate = new Date(
      req.body.receivedDate
    );

    if (Number.isNaN(receivedDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid received date'
      });
    }

    updates.receivedDate = receivedDate;
  }

  if (updates.batchNumber) {
    const duplicate = await ProductBatch.findOne({
      product: batch.product,
      batchNumber: updates.batchNumber,
      _id: { $ne: batch._id }
    });

    if (duplicate) {
      return res.status(409).json({
        message:
          'This batch number already exists for the product'
      });
    }
  }

  Object.assign(batch, updates);
  await batch.save();

  await syncExpirationAlertForBatch(
    batch,
    req.account,
    req,
    req.app.get('io')
  );

  await writeAudit({
    req,
    account: req.account,
    action: 'batch_updated',
    affectedRecord: batch._id.toString(),
    metadata: {
      changedFields: Object.keys(updates)
    }
  });

  req.app.get('io')?.emit('batchUpdated', {
    productId: batch.product.toString(),
    batch
  });

  res.json(batch);
}

export async function listExpiringSoonBatches(req, res) {
  const days = Number(req.query.days || 30);

  if (
    !Number.isInteger(days) ||
    days <= 0 ||
    days > 365
  ) {
    return res.status(400).json({
      message:
        'days must be a whole number between 1 and 365'
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const until = new Date(today);
  until.setDate(until.getDate() + days);

  const batches = await ProductBatch.find({
    quantity: { $gt: 0 },
    expirationDate: {
      $ne: null,
      $gte: today,
      $lte: until
    }
  })
    .populate(
      'product',
      'name barcode sku unitType isArchived'
    )
    .sort({
      expirationDate: 1,
      receivedDate: 1
    });

  const activeBatches = batches.filter(
    batch => !batch.product?.isArchived
  );

  res.json({
    days,
    count: activeBatches.length,
    batches: activeBatches
  });
}

export async function traceBatch(req, res) {
  const { batchNumber } = req.params;

  if (!batchNumber || !batchNumber.trim()) {
    return res.status(400).json({
      message: 'Batch number is required'
    });
  }

  const batches = await ProductBatch.find({
    batchNumber: {
      $regex: new RegExp(
        `^${batchNumber.trim()}$`,
        'i'
      )
    }
  })
    .populate('product', 'name barcode sku')
    .sort({ createdAt: -1 })
    .lean();

  if (!batches.length) {
    return res.status(404).json({
      message:
        'No batches found with that number'
    });
  }

  const batchIds = batches.map(batch => batch._id);

  const { default: Sale } =
    await import('../models/Sale.js');

  const sales = await Sale.find({
    'items.batchAllocations.batch': {
      $in: batchIds
    }
  })
    .populate('cashier', 'fullName role email')
    .populate('items.product', 'name barcode')
    .sort({ createdAt: -1 })
    .lean();

  const saleRows = [];

  for (const sale of sales) {
    for (const item of sale.items || []) {
      const allocations = item.batchAllocations || [];

      const relevant = allocations.filter(
        allocation => {
          const batchRef =
            allocation.batch?._id || allocation.batch;

          if (!batchRef) {
            return false;
          }

          const batchIdString = batchRef.toString?.();

          return batchIds.some(
            id => id.toString() === batchIdString
          );
        }
      );

      if (!relevant.length) {
        continue;
      }

      for (const allocation of relevant) {
        const batchObject = allocation.batch || {};

        const batchIdString =
          (
            batchObject._id ||
            batchObject
          )?.toString?.();

        const matchedBatch = batches.find(
          batch =>
            batch._id.toString() === batchIdString
        );

        if (!matchedBatch) {
          continue;
        }

        saleRows.push({
          saleId: sale._id,
          saleDate: sale.createdAt,
          cashier: sale.cashier,
          productName:
            item.product?.name ||
            item.name ||
            'Deleted product',
          productBarcode:
            item.product?.barcode ||
            item.barcode ||
            '',
          quantity: allocation.quantity,
          unitPrice: item.unitPrice,
          subtotal:
            (allocation.quantity || 0) *
            (item.unitPrice || 0),
          batchNumber: matchedBatch.batchNumber,
          batchId: matchedBatch._id
        });
      }
    }
  }

  const movements = await StockMovement.find({
    'batchAllocations.batch': {
      $in: batchIds
    }
  })
    .populate('account', 'fullName role')
    .populate('product', 'name barcode')
    .sort({ createdAt: -1 })
    .lean();

  const movementRows = movements.map(movement => {
    const allocations =
      movement.batchAllocations || [];

    const relevant = allocations.filter(
      allocation => {
        const batchRef =
          allocation.batch?._id || allocation.batch;

        if (!batchRef) {
          return false;
        }

        const batchIdString = batchRef.toString?.();

        return batchIds.some(
          id => id.toString() === batchIdString
        );
      }
    );

    const quantity = relevant.reduce(
      (total, allocation) =>
        total + (allocation.quantity || 0),
      0
    );

    return {
      movementId: movement._id,
      date: movement.createdAt,
      product:
        movement.product?.name || 'Deleted product',
      movementType: movement.movementType,
      quantityChanged: movement.quantityChanged,
      batchQuantity: quantity,
      reason: movement.reason,
      account:
        movement.account?.fullName || 'System'
    };
  });

  res.json({
    batches,
    sales: saleRows,
    movements: movementRows
  });
}

export async function damageBatch(req, res) {
  const { id } = req.params;

  const {
    action,
    quantity,
    reason = 'Damaged stock'
  } = req.body;

  if (
    !action ||
    !['damaged', 'destroyed'].includes(action)
  ) {
    return res.status(400).json({
      message:
        "Action must be 'damaged' or 'destroyed'"
    });
  }

  const batch = await ProductBatch.findById(id);

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const quantityValue = Number(quantity);

  if (
    !Number.isFinite(quantityValue) ||
    quantityValue <= 0
  ) {
    return res.status(400).json({
      message:
        'Quantity must be greater than zero'
    });
  }

  if (quantityValue > batch.quantity) {
    return res.status(400).json({
      message:
        'Quantity exceeds current batch quantity'
    });
  }

  const product = await Product.findById(batch.product);

  if (!product || product.isArchived) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const session = await ProductBatch.startSession();

  session.startTransaction();

  try {
    const previousBatchQuantity = batch.quantity;

    batch.quantity -= quantityValue;

    const previousStock = Number(
      product.currentStock || 0
    );

    const newStock =
      previousStock - quantityValue;

    if (newStock < 0) {
      throw new Error(
        'Stock cannot become negative'
      );
    }

    product.currentStock = newStock;

    await batch.save({ session });
    await product.save({ session });

    const movement = await StockMovement.create(
      [
        {
          product: product._id,
          account: req.account._id,
          movementType: action,
          quantityChanged: -quantityValue,
          previousStock,
          newStock,
          reason,
          branch: product.branch,
          batchAllocations: [
            {
              batch: batch._id,
              batchNumber: batch.batchNumber,
              expirationDate: batch.expirationDate,
              quantity: quantityValue
            }
          ]
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const io = req.app.get('io');

    await createOrUpdateAlert(
      product,
      req.account,
      req,
      io
    );

    await syncExpirationAlertForBatch(
      batch,
      req.account,
      req,
      io
    );

    io?.emit('stockUpdated', {
      product,
      movement: movement[0]
    });

    io?.emit('productUpdated', product);

    io?.emit('batchUpdated', {
      productId: product._id.toString(),
      batch
    });

    await writeAudit({
      req,
      account: req.account,
      action: `batch_${action}`,
      affectedRecord: batch._id.toString(),
      metadata: {
        productId: product._id.toString(),
        batchNumber: batch.batchNumber,
        quantity: quantityValue,
        previousBatchQuantity,
        newBatchQuantity: batch.quantity,
        reason
      }
    });

    res.json({
      message: `Batch marked as ${action}`,
      batch,
      product,
      movement: movement[0]
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function adjustBatchQuantity(req, res) {
  const { id } = req.params;

  const {
    actualQuantity,
    reason = 'Stock adjustment'
  } = req.body;

  const batch = await ProductBatch.findById(id);

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const actual = Number(actualQuantity);

  if (
    !Number.isInteger(actual) ||
    actual < 0
  ) {
    return res.status(400).json({
      message:
        'Actual quantity must be a non-negative whole number'
    });
  }

  const product = await Product.findById(batch.product);

  if (!product || product.isArchived) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const currentBatchQuantity = batch.quantity;

  const difference =
    actual - currentBatchQuantity;

  if (difference === 0) {
    return res.json({
      message: 'No change required',
      batch,
      product
    });
  }

  const session = await ProductBatch.startSession();

  session.startTransaction();

  try {
    const previousStock = Number(
      product.currentStock || 0
    );

    const newStock = previousStock + difference;

    if (newStock < 0) {
      throw new Error(
        'Stock cannot become negative'
      );
    }

    batch.quantity = actual;
    product.currentStock = newStock;

    await batch.save({ session });
    await product.save({ session });

    const movement = await StockMovement.create(
      [
        {
          product: product._id,
          account: req.account._id,
          movementType: 'stock_adjustment',
          quantityChanged: difference,
          previousStock,
          newStock,
          reason: reason || 'Stock adjustment',
          branch: product.branch,
          batchAllocations: [
            {
              batch: batch._id,
              batchNumber: batch.batchNumber,
              expirationDate: batch.expirationDate,
              quantity: Math.abs(difference)
            }
          ]
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const io = req.app.get('io');

    await createOrUpdateAlert(
      product,
      req.account,
      req,
      io
    );

    await syncExpirationAlertForBatch(
      batch,
      req.account,
      req,
      io
    );

    if (difference > 0) {
      try {
        await notifyStockAdded({
          product,
          movement: movement[0],
          account: req.account,
          io
        });
      } catch (notificationError) {
        console.error(
          'Stock-added notification processing failed after batch adjustment:',
          notificationError
        );
      }
    }

    io?.emit('stockUpdated', {
      product,
      movement: movement[0]
    });

    io?.emit('productUpdated', product);

    io?.emit('batchUpdated', {
      productId: product._id.toString(),
      batch
    });

    await writeAudit({
      req,
      account: req.account,
      action: 'batch_quantity_adjusted',
      affectedRecord: batch._id.toString(),
      metadata: {
        productId: product._id.toString(),
        batchNumber: batch.batchNumber,
        previousBatchQuantity:
          currentBatchQuantity,
        newBatchQuantity: actual,
        difference,
        reason
      }
    });

    res.json({
      message: 'Batch quantity adjusted',
      batch,
      product,
      movement: movement[0]
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function listBatches(req, res) {
  const batches = await ProductBatch.find({
    quantity: { $gt: 0 }
  })
    .populate('product', 'name barcode sku')
    .sort({
      expirationDate: 1,
      receivedDate: 1
    })
    .lean();

  res.json(batches);
}