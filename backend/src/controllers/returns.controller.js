import mongoose from 'mongoose';
import SaleReturn from '../models/SaleReturn.js';
import QuarantineItem from '../models/QuarantineItem.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import StockMovement from '../models/StockMovement.js';
import { writeAudit } from '../utils/audit.js';

function getObjectIdString(value) {
  return value?._id?.toString?.() || value?.toString?.() || '';
}

function getSaleReference(sale) {
  if (!sale) return 'Deleted sale';

  if (sale.receiptNumber) {
    return sale.receiptNumber;
  }

  if (sale.saleNumber) {
    return sale.saleNumber;
  }

  const id = getObjectIdString(sale._id);

  return id ? `Sale #${id.slice(-8).toUpperCase()}` : '—';
}

function serializeReturnRecord(returnRecord) {
  const sale = returnRecord.sale || null;
  const cashier = sale?.cashier || null;

  return {
    ...returnRecord,

    saleReference: getSaleReference(sale),

    originalSale: sale
      ? {
          id: getObjectIdString(sale._id),
          reference: getSaleReference(sale),
          date: sale.createdAt || null,
          totalAmount: Number(sale.totalAmount || 0),
          refundedAmount: Number(sale.refundedAmount || 0),
          netAmount:
            sale.netAmount !== undefined &&
            sale.netAmount !== null
              ? Number(sale.netAmount)
              : Math.max(
                  Number(sale.totalAmount || 0) -
                    Number(sale.refundedAmount || 0),
                  0
                ),
          status: sale.status || 'completed',
          cashier: cashier
            ? {
                id: getObjectIdString(cashier._id),
                fullName: cashier.fullName || '—',
                role: cashier.role || ''
              }
            : null
        }
      : null
  };
}

function buildPreviousReturnTotals(previousReturns) {
  const totals = new Map();

  for (const returnRecord of previousReturns) {
    for (const item of returnRecord.items || []) {
      const saleItemIndex = String(item.saleItemIndex);

      totals.set(
        saleItemIndex,
        (totals.get(saleItemIndex) || 0) +
          Number(item.quantity || 0)
      );
    }
  }

  return totals;
}

function allocateReturnedQuantityToBatches(
  saleItem,
  returnedQuantity
) {
  let quantityRemaining = Number(returnedQuantity);
  const allocations = [];

  for (const originalAllocation of saleItem.batchAllocations || []) {
    if (quantityRemaining <= 0) break;

    const originallySoldFromBatch = Number(
      originalAllocation.quantity || 0
    );

    if (originallySoldFromBatch <= 0) continue;

    const quantityForThisBatch = Math.min(
      originallySoldFromBatch,
      quantityRemaining
    );

    allocations.push({
      batch: originalAllocation.batch,
      batchNumber: originalAllocation.batchNumber || '',
      expirationDate: originalAllocation.expirationDate || null,
      quantity: quantityForThisBatch
    });

    quantityRemaining -= quantityForThisBatch;
  }

  if (quantityRemaining > 0) {
    const error = new Error(
      `Unable to identify original batch allocation for ${saleItem.name}.`
    );
    error.statusCode = 400;
    throw error;
  }

  return allocations;
}

function calculateSaleStatus(totalAmount, refundedAmount, oldStatus) {
  if (oldStatus === 'voided') return 'voided';

  if (refundedAmount <= 0) {
    return 'completed';
  }

  if (refundedAmount >= totalAmount) {
    return 'refunded';
  }

  return 'partially_refunded';
}

export async function listReturns(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      saleId
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const query = saleId ? { sale: saleId } : {};

    const returnRecords = await SaleReturn.find(query)
      .populate({
        path: 'sale',
        select: `
          receiptNumber
          saleNumber
          totalAmount
          refundedAmount
          netAmount
          status
          createdAt
          cashier
        `,
        populate: {
          path: 'cashier',
          select: 'fullName role'
        }
      })
      .populate('account', 'fullName email role')
      .populate('processedBy', 'fullName email role')
      .populate('items.product', 'name barcode')
      .populate('items.quarantineItem', 'status condition quantity')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .lean();

    const total = await SaleReturn.countDocuments(query);

    const returns = returnRecords.map(serializeReturnRecord);

    res.json({
      returns,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(
          1,
          Math.ceil(total / safeLimit)
        )
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Unable to load return records'
    });
  }
}

export async function getReturn(req, res) {
  try {
    const returnRecord = await SaleReturn.findById(req.params.id)
      .populate({
        path: 'sale',
        select: `
          receiptNumber
          saleNumber
          items
          totalAmount
          refundedAmount
          netAmount
          status
          createdAt
          cashier
        `,
        populate: {
          path: 'cashier',
          select: 'fullName role'
        }
      })
      .populate('account', 'fullName email role')
      .populate('processedBy', 'fullName email role')
      .populate('items.product', 'name barcode currentStock')
      .populate('items.quarantineItem')
      .lean();

    if (!returnRecord) {
      return res.status(404).json({
        error: 'Return not found'
      });
    }

    res.json(serializeReturnRecord(returnRecord));
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Unable to load return details'
    });
  }
}

export async function getSaleReturnBalance(req, res) {
  try {
    const { saleId } = req.params;

    if (!mongoose.isValidObjectId(saleId)) {
      return res.status(400).json({
        error: 'Invalid sale ID'
      });
    }

    const sale = await Sale.findById(saleId)
      .populate('cashier', 'fullName role')
      .lean();

    if (!sale) {
      return res.status(404).json({
        error: 'Sale not found'
      });
    }

    const previousReturns = await SaleReturn.find({
      sale: sale._id
    })
      .select('items.saleItemIndex items.quantity')
      .lean();

    const returnedBySaleItem =
      buildPreviousReturnTotals(previousReturns);

    const items = (sale.items || []).map((saleItem, index) => {
      const soldQuantity = Number(saleItem.quantity || 0);

      const returnedQuantity =
        returnedBySaleItem.get(String(index)) || 0;

      const remainingReturnable = Math.max(
        soldQuantity - returnedQuantity,
        0
      );

      return {
        saleItemIndex: index,
        product: saleItem.product,
        name: saleItem.name,
        barcode: saleItem.barcode || '',
        unitPrice: Number(saleItem.unitPrice || 0),
        subtotal: Number(saleItem.subtotal || 0),
        soldQuantity,
        returnedQuantity,
        remainingReturnable,
        fullyReturned: remainingReturnable === 0,
        batchAllocations: saleItem.batchAllocations || []
      };
    });

    res.json({
      sale: {
        _id: sale._id,
        reference: getSaleReference(sale),
        createdAt: sale.createdAt,
        totalAmount: Number(sale.totalAmount || 0),
        refundedAmount: Number(sale.refundedAmount || 0),
        netAmount:
          sale.netAmount !== undefined && sale.netAmount !== null
            ? Number(sale.netAmount)
            : Math.max(
                Number(sale.totalAmount || 0) -
                  Number(sale.refundedAmount || 0),
                0
              ),
        paymentMethod: sale.paymentMethod || 'cash',
        status: sale.status || 'completed',
        cashier: sale.cashier
          ? {
              fullName: sale.cashier.fullName || '—',
              role: sale.cashier.role || ''
            }
          : null
      },

      items
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Unable to load sale return balance'
    });
  }
}

export async function createReturn(req, res) {
  const session = await mongoose.startSession();

  try {
    const {
      saleId,
      items,
      reason
    } = req.body;

    const account = req.account;

    if (!['admin', 'manager'].includes(account?.role)) {
      return res.status(403).json({
        error: 'Only admin/manager can process returns'
      });
    }

    if (!mongoose.isValidObjectId(saleId)) {
      return res.status(400).json({
        error: 'Invalid sale ID'
      });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        error: 'Select at least one item to return'
      });
    }

    if (!String(reason || '').trim()) {
      return res.status(400).json({
        error: 'A return reason is required'
      });
    }

    let createdReturnId = null;

    await session.withTransaction(async () => {
      const sale = await Sale.findById(saleId).session(session);

      if (!sale) {
        const error = new Error('Sale not found');
        error.statusCode = 404;
        throw error;
      }

      if (sale.status === 'voided') {
        const error = new Error(
          'A voided sale cannot be returned'
        );
        error.statusCode = 400;
        throw error;
      }

      const previousReturns = await SaleReturn.find({
        sale: sale._id
      })
        .select('items.saleItemIndex items.quantity')
        .session(session)
        .lean();

      const returnedBySaleItem =
        buildPreviousReturnTotals(previousReturns);

      const submittedIndexes = new Set();
      const preparedItems = [];
      let totalRefund = 0;

      for (const requestedItem of items) {
        const saleItemIndex = Number(
          requestedItem.saleItemIndex
        );

        const returnQuantity = Number(
          requestedItem.quantity
        );

        if (
          !Number.isInteger(saleItemIndex) ||
          saleItemIndex < 0 ||
          saleItemIndex >= sale.items.length
        ) {
          const error = new Error('Invalid sale item index');
          error.statusCode = 400;
          throw error;
        }

        if (submittedIndexes.has(saleItemIndex)) {
          const error = new Error(
            'You cannot include the same item twice in one return'
          );
          error.statusCode = 400;
          throw error;
        }

        submittedIndexes.add(saleItemIndex);

        if (
          !Number.isInteger(returnQuantity) ||
          returnQuantity < 1
        ) {
          const error = new Error(
            'Return quantity must be a whole number greater than zero'
          );
          error.statusCode = 400;
          throw error;
        }

        const saleItem = sale.items[saleItemIndex];

        const alreadyReturned =
          returnedBySaleItem.get(String(saleItemIndex)) || 0;

        const remainingReturnable =
          Number(saleItem.quantity) - alreadyReturned;

        if (remainingReturnable <= 0) {
          const error = new Error(
            `${saleItem.name} has already been fully returned`
          );
          error.statusCode = 400;
          throw error;
        }

        if (returnQuantity > remainingReturnable) {
          const error = new Error(
            `${saleItem.name}: only ${remainingReturnable} unit(s) remain eligible for return`
          );
          error.statusCode = 400;
          throw error;
        }

        const condition = String(
          requestedItem.condition || ''
        );

        const allowedConditions = [
          'resellable',
          'damaged',
          'opened',
          'expired',
          'other'
        ];

        if (!allowedConditions.includes(condition)) {
          const error = new Error(
            `Invalid return condition for ${saleItem.name}`
          );
          error.statusCode = 400;
          throw error;
        }

        const returnedBatchAllocations =
          allocateReturnedQuantityToBatches(
            saleItem,
            returnQuantity
          );

        const subtotal =
          returnQuantity * Number(saleItem.unitPrice);

        totalRefund += subtotal;

        returnedBySaleItem.set(
          String(saleItemIndex),
          alreadyReturned + returnQuantity
        );

        preparedItems.push({
          saleItemIndex,
          saleItem,
          returnQuantity,
          condition,
          itemReason: String(
            requestedItem.reason || ''
          ).trim(),
          subtotal,
          returnedBatchAllocations
        });
      }

      const returnItems = [];
      const resellableByProduct = new Map();
      const quarantineItemsToLink = [];

      for (const preparedItem of preparedItems) {
        const {
          saleItemIndex,
          saleItem,
          returnQuantity,
          condition,
          itemReason,
          subtotal,
          returnedBatchAllocations
        } = preparedItem;

        const returnItem = {
          saleItemIndex,
          product: saleItem.product,
          name: saleItem.name,
          barcode: saleItem.barcode || '',
          quantity: returnQuantity,
          unitPrice: saleItem.unitPrice,
          subtotal,
          condition,
          reason: itemReason,
          batchAllocations: returnedBatchAllocations
        };

        if (condition === 'resellable') {
          const productId = getObjectIdString(saleItem.product);

          if (!resellableByProduct.has(productId)) {
            resellableByProduct.set(productId, {
              productId: saleItem.product,
              productName: saleItem.name,
              quantity: 0,
              batchAllocations: []
            });
          }

          const productEntry =
            resellableByProduct.get(productId);

          productEntry.quantity += returnQuantity;
          productEntry.batchAllocations.push(
            ...returnedBatchAllocations
          );
        } else {
          const quarantineItem = new QuarantineItem({
            product: saleItem.product,
            name: saleItem.name,
            barcode: saleItem.barcode || '',
            quantity: returnQuantity,
            unitCost: saleItem.unitPrice,
            source: 'customer_return',
            condition,
            reason:
              itemReason ||
              'Customer return marked as non-resellable',
            status: 'pending_inspection'
          });

          await quarantineItem.save({ session });

          returnItem.quarantineItem = quarantineItem._id;
          quarantineItemsToLink.push(quarantineItem);
        }

        returnItems.push(returnItem);
      }

      for (const productEntry of resellableByProduct.values()) {
        const product = await Product.findById(productEntry.productId)
          .session(session);

        if (!product) {
          const error = new Error(
            `Product not found: ${productEntry.productName}`
          );
          error.statusCode = 404;
          throw error;
        }

        const previousStock = Number(product.currentStock || 0);

        for (const allocation of productEntry.batchAllocations) {
          const batch = await ProductBatch.findOneAndUpdate(
            {
              _id: allocation.batch,
              product: product._id
            },
            {
              $inc: {
                quantity: allocation.quantity
              }
            },
            {
              new: true,
              session
            }
          );

          if (!batch) {
            const error = new Error(
              `Original batch not found for ${productEntry.productName}`
            );
            error.statusCode = 400;
            throw error;
          }
        }

        product.currentStock =
          previousStock + productEntry.quantity;

        await product.save({ session });

        await StockMovement.create(
          [
            {
              product: product._id,
              account: account._id,
              movementType: 'customer_return',
              quantityChanged: productEntry.quantity,
              previousStock,
              newStock: product.currentStock,
              reason: `Resellable customer return: ${productEntry.productName}`,
              branch: product.branch || 'Main Branch',
              batchAllocations: productEntry.batchAllocations
            }
          ],
          { session }
        );
      }

      const saleReturn = new SaleReturn({
        sale: sale._id,
        account: account._id,
        items: returnItems,
        totalRefund,
        reason: String(reason).trim(),
        processedBy: account._id,
        branch: sale.branch || 'Main Branch'
      });

      await saleReturn.save({ session });

      for (const quarantineItem of quarantineItemsToLink) {
        quarantineItem.sourceReturn = saleReturn._id;
        await quarantineItem.save({ session });
      }

      const totalSaleAmount = Number(sale.totalAmount || 0);
      const oldRefundedAmount = Number(
        sale.refundedAmount || 0
      );

      const refundedAmount = Math.min(
        oldRefundedAmount + totalRefund,
        totalSaleAmount
      );

      const netAmount = Math.max(
        totalSaleAmount - refundedAmount,
        0
      );

      sale.returns.push(saleReturn._id);
      sale.hasReturns = true;
      sale.refundedAmount = refundedAmount;
      sale.netAmount = netAmount;
      sale.status = calculateSaleStatus(
        totalSaleAmount,
        refundedAmount,
        sale.status
      );

      await sale.save({ session });

      createdReturnId = saleReturn._id;
    });

    const createdReturnRecord = await SaleReturn.findById(
      createdReturnId
    )
      .populate({
        path: 'sale',
        select: `
          receiptNumber
          saleNumber
          totalAmount
          refundedAmount
          netAmount
          status
          createdAt
          cashier
        `,
        populate: {
          path: 'cashier',
          select: 'fullName role'
        }
      })
      .populate('processedBy', 'fullName email role')
      .populate('items.product', 'name barcode')
      .populate('items.quarantineItem')
      .lean();

    await writeAudit({
      req,
      account,
      action: 'return_created',
      affectedRecord: createdReturnId.toString(),
      metadata: {
        saleId,
        totalRefund: createdReturnRecord.totalRefund,
        itemCount: createdReturnRecord.items.length
      }
    });

    res.status(201).json({
      message: 'Return processed successfully',
      return: serializeReturnRecord(createdReturnRecord)
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'Unable to process return'
    });
  } finally {
    await session.endSession();
  }
}