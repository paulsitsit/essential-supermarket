import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import { writeAudit } from '../utils/audit.js';

import {
  createBatchNumber,
  normalizeExpirationDate,
  updateBatchExpiration
} from '../services/batch.service.js';

import {
  syncExpirationAlertForBatch
} from '../services/expirationAlert.service.js';

export async function getBatchesByBarcode(req, res) {
  const barcode = String(
    req.params.barcode || ''
  )
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
    quantity: {
      $gt: 0
    }
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
    quantity: {
      $gt: 0
    }
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
      message:
        'Received quantity must be greater than zero'
    });
  }

  const safeBatchNumber =
    String(batchNumber || '').trim() ||
    createBatchNumber(product);

  const existingBatch =
    await ProductBatch.findOne({
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

  const previousStock = Number(
    product.currentStock || 0
  );

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

  product.currentStock =
    previousStock + receivedQuantity;

  await product.save();

  const { default: StockMovement } =
    await import('../models/StockMovement.js');

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

  const { createOrUpdateAlert } =
    await import('../services/inventory.service.js');

  await createOrUpdateAlert(
    product,
    req.account,
    req,
    req.app.get('io')
  );

  await syncExpirationAlertForBatch(
    batch,
    req.account,
    req,
    req.app.get('io')
  );

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

  req.app.get('io')?.emit('stockUpdated', {
    product,
    movement
  });

  req.app.get('io')?.emit('productUpdated', product);

  req.app.get('io')?.emit('batchUpdated', {
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
  const batch = await ProductBatch.findById(
    req.params.id
  );

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const updates = {};

  if (req.body.expirationDate !== undefined) {
    updates.expirationDate =
      normalizeExpirationDate(
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
      _id: {
        $ne: batch._id
      }
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
    quantity: {
      $gt: 0
    },
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