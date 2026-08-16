import ProductBatch from '../models/ProductBatch.js';
import Product from '../models/Product.js';

function toStartOfDay(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
}

export function normalizeExpirationDate(value) {
  if (!value) {
    return null;
  }

  const date = toStartOfDay(value);

  if (!date) {
    const error = new Error(
      'Invalid expiration date'
    );
    error.statusCode = 400;
    throw error;
  }

  return date;
}

export function createBatchNumber(product) {
  const barcode =
    String(product.barcode || 'PRODUCT')
      .replace(/[^A-Z0-9]/gi, '')
      .slice(-6)
      .toUpperCase() || 'PRODUCT';

  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);

  const random = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `LOT-${barcode}-${stamp}-${random}`;
}

export async function getActiveBatchesForProduct(
  productId
) {
  return ProductBatch.find({
    product: productId,
    quantity: {
      $gt: 0
    }
  })
    .sort({
      expirationDate: 1,
      receivedDate: 1,
      createdAt: 1
    })
    .lean();
}

export async function createReceivedBatch({
  product,
  quantity,
  expirationDate,
  batchNumber,
  receivedDate,
  account
}) {
  const receivedQuantity = Number(quantity);

  if (
    !Number.isFinite(receivedQuantity) ||
    receivedQuantity <= 0
  ) {
    const error = new Error(
      'Received quantity must be greater than zero'
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedExpiration =
    normalizeExpirationDate(expirationDate);

  const normalizedReceivedDate =
    toStartOfDay(receivedDate) || new Date();

  const safeBatchNumber =
    String(batchNumber || '').trim() ||
    createBatchNumber(product);

  const existingBatch =
    await ProductBatch.findOne({
      product: product._id,
      batchNumber: safeBatchNumber
    });

  if (existingBatch) {
    const error = new Error(
      'This batch number already exists for the product'
    );
    error.statusCode = 409;
    throw error;
  }

  const batch = await ProductBatch.create({
    product: product._id,
    barcode: product.barcode,
    expirationDate: normalizedExpiration,
    quantity: receivedQuantity,
    receivedDate: normalizedReceivedDate,
    batchNumber: safeBatchNumber,
    branch: product.branch,
    createdBy: account._id
  });

  return batch;
}

export async function allocateBatchesFEFO({
  product,
  quantity
}) {
  let remaining = Number(quantity);

  if (
    !Number.isFinite(remaining) ||
    remaining <= 0
  ) {
    const error = new Error(
      'Quantity must be greater than zero'
    );
    error.statusCode = 400;
    throw error;
  }

  /*
   * FEFO order:
   * 1. Dated batches, earliest expiration first.
   * 2. Undated batches are used only after dated stock.
   * 3. Ties use oldest received batch first.
   */
  const batches = await ProductBatch.aggregate([
    {
      $match: {
        product: product._id,
        quantity: {
          $gt: 0
        }
      }
    },
    {
      $addFields: {
        expirationSort: {
          $ifNull: [
            '$expirationDate',
            new Date('9999-12-31T00:00:00.000Z')
          ]
        }
      }
    },
    {
      $sort: {
        expirationSort: 1,
        receivedDate: 1,
        createdAt: 1
      }
    }
  ]);

  const available = batches.reduce(
    (sum, batch) => sum + Number(batch.quantity || 0),
    0
  );

  if (available < remaining) {
    const error = new Error(
      `Insufficient batch stock for ${product.name}. Available: ${available}, requested: ${remaining}`
    );
    error.statusCode = 409;
    throw error;
  }

  const allocations = [];

  for (const batchData of batches) {
    if (remaining <= 0) {
      break;
    }

    const batch = await ProductBatch.findById(
      batchData._id
    );

    if (!batch || batch.quantity <= 0) {
      continue;
    }

    const allocatedQuantity = Math.min(
      Number(batch.quantity),
      remaining
    );

    batch.quantity -= allocatedQuantity;
    await batch.save();

    allocations.push({
      batch: batch._id,
      batchNumber: batch.batchNumber || '',
      expirationDate: batch.expirationDate || null,
      quantity: allocatedQuantity
    });

    remaining -= allocatedQuantity;
  }

  if (remaining > 0) {
    const error = new Error(
      'Unable to complete batch allocation'
    );
    error.statusCode = 409;
    throw error;
  }

  return allocations;
}

export async function updateBatchExpiration({
  batchId,
  expirationDate
}) {
  const batch = await ProductBatch.findById(batchId);

  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  batch.expirationDate =
    normalizeExpirationDate(expirationDate);

  await batch.save();

  return batch;
}

export async function removeBatchesForProduct(
  productId
) {
  return ProductBatch.deleteMany({
    product: productId
  });
}

export async function verifyProductBatchStock(
  productId
) {
  const result = await ProductBatch.aggregate([
    {
      $match: {
        product: productId
      }
    },
    {
      $group: {
        _id: '$product',
        quantity: {
          $sum: '$quantity'
        }
      }
    }
  ]);

  return result[0]?.quantity || 0;
}