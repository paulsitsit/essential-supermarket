import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import { writeAudit } from '../utils/audit.js';

import {
  allocateBatchesFEFO
} from '../services/batch.service.js';

import {
  createOrUpdateAlert
} from '../services/inventory.service.js';

import {
  syncExpirationAlertsForProduct
} from '../services/expirationAlert.service.js';

export async function listSales(req, res) {
  const {
    page = 1,
    limit = 20,
    status
  } = req.query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  const sales = await Sale.find(filter)
    .populate('cashier', 'fullName role')
    .populate('items.product', 'name barcode')
    .populate(
      'items.batchAllocations.batch',
      'batchNumber expirationDate'
    )
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(
      (Number(page) - 1) * Number(limit)
    );

  const total = await Sale.countDocuments(filter);

  res.json({
    sales,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(
        total / Number(limit)
      )
    }
  });
}

export async function createSale(req, res) {
  const {
    items,
    paymentMethod = 'cash'
  } = req.body;

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      message: 'At least one item is required'
    });
  }

  const io = req.app.get('io');

  // Start transaction
  const session = await Product.startSession();
  session.startTransaction();

  try {
    /*
     * Validate all items first (read-only checks)
     */
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findById(
        item.productId
      ).session(session);

      if (!product || product.isArchived) {
        const error = new Error(
          `Product ${item.productId || ''} not found`
        );
        error.statusCode = 400;
        throw error;
      }

      const quantity = Number(item.quantity || 0);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        const error = new Error(
          'Quantity must be greater than zero'
        );
        error.statusCode = 400;
        throw error;
      }

      if (product.currentStock < quantity) {
        const error = new Error(
          `Insufficient stock for ${product.name}`
        );
        error.statusCode = 409;
        throw error;
      }

      const unitPrice = Number(
        item.unitPrice ?? product.costPrice
      );

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        const error = new Error(
          `Invalid unit price for ${product.name}`
        );
        error.statusCode = 400;
        throw error;
      }

      preparedItems.push({
        product,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity
      });
    }

    const saleItems = [];
    const stockMovements = [];
    let totalAmount = 0;

    /*
     * Now perform all mutations inside the transaction
     */
    for (const item of preparedItems) {
      const {
        product,
        quantity,
        unitPrice,
        subtotal
      } = item;

      const batchAllocations =
        await allocateBatchesFEFO({
          product,
          quantity,
          session
        });

      // Keep the allocations on the item so the post-commit
      // side-effects loop below can reference them without
      // recomputing or guessing at what was deducted.
      item.batchAllocations = batchAllocations;

      const previousStock = Number(
        product.currentStock || 0
      );

      const newStock = previousStock - quantity;

      if (newStock < 0) {
        const error = new Error(
          `Stock cannot become negative for ${product.name}`
        );
        error.statusCode = 409;
        throw error;
      }

      product.currentStock = newStock;
      await product.save({ session });

      const movement = await StockMovement.create(
        [{
          product: product._id,
          account: req.account._id,
          movementType: 'stock_adjustment',
          quantityChanged: -quantity,
          previousStock,
          newStock,
          reason: 'POS sale',
          branch: product.branch,
          batchAllocations
        }],
        { session }
      );

      item.movement = movement[0];
      stockMovements.push(movement[0]);

      saleItems.push({
        product: product._id,
        name: product.name,
        barcode: product.barcode,
        quantity,
        unitPrice,
        subtotal,
        batchAllocations
      });

      totalAmount += subtotal;
    }

    const sale = await Sale.create(
      [{
        cashier: req.account._id,
        items: saleItems,
        totalAmount,
        paymentMethod,
        status: 'completed'
      }],
      { session }
    );

    await writeAudit({
      req,
      account: req.account,
      action: 'sale_completed',
      affectedRecord: sale[0]._id.toString(),
      metadata: {
        totalAmount,
        itemCount: saleItems.length,
        stockMovementIds: stockMovements.map(
          movement => movement._id.toString()
        )
      },
      session
    });

    // Commit transaction
    await session.commitTransaction();

    /*
     * After commit: emit socket events and update alerts
     * (these are side effects, so they run only after success)
     */
    for (const item of preparedItems) {
      const { product, batchAllocations, movement } = item;

      // Re-fetch product to ensure we emit final state
      const freshProduct = await Product.findById(product._id);

      await createOrUpdateAlert(
        freshProduct,
        req.account,
        req,
        io
      );

      await syncExpirationAlertsForProduct(
        freshProduct._id,
        req.account,
        req,
        io
      );

      io?.emit('productUpdated', freshProduct);

      io?.emit('stockUpdated', {
        product: freshProduct,
        movement
      });

      io?.emit('batchUpdated', {
        productId: freshProduct._id.toString(),
        batchAllocations
      });
    }

    io?.emit('saleCreated', sale[0]);

    return res.status(201).json({
      sale: sale[0],
      movements: stockMovements
    });
  } catch (err) {
    // Abort transaction on any error
    await session.abortTransaction();

    return res.status(err.statusCode || 500).json({
      message: err.message || 'Unable to complete sale'
    });
  } finally {
    session.endSession();
  }
}