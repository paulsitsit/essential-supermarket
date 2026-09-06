import StockMovement from '../models/StockMovement.js';
import StockLedgerEntry from '../models/StockLedgerEntry.js';
import ProductBatch from '../models/ProductBatch.js';

/**
 * Create a stock ledger entry for a specific batch
 */
export async function createLedgerEntry({
  productId,
  batchId,
  batchNumber,
  movementType,
  quantityChanged,
  batchStockBefore,
  batchStockAfter,
  reason,
  referenceType,
  referenceId,
  performedBy,
  branch
}) {
  const entry = await StockLedgerEntry.create({
    product: productId,
    batch: batchId,
    batchNumber: batchNumber || '',
    movementType,
    quantityChanged,
    batchStockBefore,
    batchStockAfter,
    reason,
    referenceType: referenceType || 'manual',
    referenceId: referenceId || null,
    performedBy,
    branch: branch || 'Main Branch'
  });

  return entry;
}

/**
 * Get all ledger entries for a specific batch
 */
export async function getBatchLedger(batchId, options = {}) {
  const { limit = 100, skip = 0, startDate, endDate } = options;

  const query = { batch: batchId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const entries = await StockLedgerEntry.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('product', 'name sku')
    .populate('performedBy', 'fullName role');

  const total = await StockLedgerEntry.countDocuments(query);

  return { entries, total, limit, skip };
}

/**
 * Get ledger entries for a product across all batches
 */
export async function getProductLedger(productId, options = {}) {
  const { limit = 100, skip = 0, startDate, endDate, batchId } = options;

  const query = { product: productId };

  if (batchId) {
    query.batch = batchId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const entries = await StockLedgerEntry.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('batch', 'batchNumber barcode expirationDate')
    .populate('performedBy', 'fullName role');

  const total = await StockLedgerEntry.countDocuments(query);

  return { entries, total, limit, skip };
}

/**
 * Get stock movements (product-level) with filters
 */
export async function getProductMovements(productId, options = {}) {
  const { limit = 100, skip = 0, startDate, endDate, movementType } = options;

  const query = { product: productId };

  if (movementType) {
    query.movementType = movementType;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const movements = await StockMovement.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('account', 'fullName role')
    .populate('batchAllocations.batch', 'batchNumber barcode expirationDate');

  const total = await StockMovement.countDocuments(query);

  return { movements, total, limit, skip };
}

/**
 * Calculate current stock for a batch by summing ledger entries
 */
export async function calculateBatchStockFromLedger(batchId) {
  const entries = await StockLedgerEntry.find({ batch: batchId }).select('quantityChanged');

  return entries.reduce((total, entry) => total + entry.quantityChanged, 0);
}

/**
 * Get variance between ledger-calculated stock and actual batch stock
 */
export async function getBatchVariance(batchId) {
  const batch = await ProductBatch.findById(batchId);

  if (!batch) {
    throw new Error('Batch not found');
  }

  const ledgerStock = await calculateBatchStockFromLedger(batchId);
  const actualStock = batch.quantity;
  const variance = actualStock - ledgerStock;

  return {
    batchId,
    batchNumber: batch.batchNumber,
    barcode: batch.barcode,
    ledgerStock,
    actualStock,
    variance,
    variancePercentage: ledgerStock > 0 ? ((variance / ledgerStock) * 100).toFixed(2) : 0
  };
}

/**
 * Get all batches with variances for a product
 */
export async function getProductVariances(productId) {
  const batches = await ProductBatch.find({ product: productId, quantity: { $gt: 0 } });

  const variances = await Promise.all(
    batches.map(async batch => {
      const ledgerStock = await calculateBatchStockFromLedger(batch._id);
      const variance = batch.quantity - ledgerStock;

      return {
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        barcode: batch.barcode,
        expirationDate: batch.expirationDate,
        ledgerStock,
        actualStock: batch.quantity,
        variance,
        hasVariance: variance !== 0
      };
    })
  );

  return variances.filter(v => v.hasVariance);
}

/**
 * Create correction entry for stock reconciliation
 */
export async function createCorrectionEntry({
  productId,
  batchId,
  batchNumber,
  adjustmentQuantity,
  reason,
  performedBy,
  branch,
  referenceId
}) {
  const batch = await ProductBatch.findById(batchId);

  if (!batch) {
    throw new Error('Batch not found');
  }

  const entry = await createLedgerEntry({
    productId,
    batchId,
    batchNumber,
    movementType: 'manual_correction',
    quantityChanged: adjustmentQuantity,
    batchStockBefore: batch.quantity,
    batchStockAfter: batch.quantity + adjustmentQuantity,
    reason,
    referenceType: 'adjustment',
    referenceId,
    performedBy,
    branch
  });

  return entry;
}