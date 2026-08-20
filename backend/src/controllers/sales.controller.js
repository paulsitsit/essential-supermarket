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

  if (!req.account?._id) {
    return res.status(401).json({
      message: 'Authentication is required'
    });
  }

  const io = req.app.get('io');
  const session = await Product.startSession();

  let sale = null;
  let stockMovements = [];
  let preparedItems = [];

  try {
    session.startTransaction();

    preparedItems = [];

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

      if (Number(product.currentStock || 0) < quantity) {
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
        subtotal: unitPrice * quantity,
        batchAllocations: [],
        movement: null
      });
    }

    const saleItems = [];
    stockMovements = [];
    let totalAmount = 0;

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

      const createdMovement =
        await StockMovement.create(
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

      item.movement = createdMovement[0];
      stockMovements.push(createdMovement[0]);

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

    const createdSale = await Sale.create(
      [{
        cashier: req.account._id,
        items: saleItems,
        totalAmount,
        paymentMethod,
        status: 'completed'
      }],
      { session }
    );

    sale = createdSale[0];

    await writeAudit({
      req,
      account: req.account,
      action: 'sale_completed',
      affectedRecord: sale._id.toString(),
      metadata: {
        totalAmount,
        itemCount: saleItems.length,
        stockMovementIds: stockMovements.map(
          movement => movement._id.toString()
        )
      },
      session
    });

    await session.commitTransaction();

    /*
     * The transaction has succeeded at this point.
     * Return success to the client now.
     */
    res.status(201).json({
      sale,
      movements: stockMovements
    });

    /*
     * Run non-critical work after responding.
     * Any failure here must not change a completed sale
     * into a 500 response.
     */
    void runPostSaleEffects({
      preparedItems,
      account: req.account,
      req,
      io,
      sale
    });
  } catch (err) {
    console.error('Create sale error:', err);

    /*
     * Only abort an active transaction.
     * Calling abortTransaction after commitTransaction causes:
     * "Cannot call abortTransaction after calling commitTransaction".
     */
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error(
          'Unable to abort sale transaction:',
          abortError
        );
      }
    }

    if (!res.headersSent) {
      return res.status(err.statusCode || 500).json({
        message: err.message || 'Unable to complete sale'
      });
    }
  } finally {
    await session.endSession();
  }
}

async function runPostSaleEffects({
  preparedItems,
  account,
  req,
  io,
  sale
}) {
  try {
    for (const item of preparedItems) {
      const {
        product,
        batchAllocations,
        movement
      } = item;

      const freshProduct = await Product.findById(
        product._id
      );

      if (!freshProduct) {
        console.warn(
          `Post-sale effects skipped: product ${product._id} was not found`
        );

        continue;
      }

      try {
        await createOrUpdateAlert(
          freshProduct,
          account,
          req,
          io
        );
      } catch (alertError) {
        console.error(
          `Low-stock alert update failed for ${freshProduct._id}:`,
          alertError
        );
      }

      try {
        await syncExpirationAlertsForProduct(
          freshProduct._id,
          account,
          req,
          io
        );
      } catch (expirationError) {
        console.error(
          `Expiration alert sync failed for ${freshProduct._id}:`,
          expirationError
        );
      }

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

    io?.emit('saleCreated', sale);
  } catch (error) {
    console.error(
      'Post-sale side effects failed:',
      error
    );
  }
}