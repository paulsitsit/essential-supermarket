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

function getReceiptDatePart(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

async function generateReceiptNumber(session) {
  const datePart = getReceiptDatePart();
  const prefix = `ES-MAIN-${datePart}-`;

  const latestSale = await Sale.findOne({
    receiptNumber: {
      $regex: `^${prefix}`
    }
  })
    .sort({
      receiptNumber: -1
    })
    .select('receiptNumber')
    .session(session)
    .lean();

  let nextSequence = 1;

  if (latestSale?.receiptNumber) {
    const previousSequence = Number(
      latestSale.receiptNumber.split('-').pop()
    );

    if (
      Number.isInteger(previousSequence) &&
      previousSequence >= 0
    ) {
      nextSequence = previousSequence + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
}

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

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const sales = await Sale.find(filter)
    .populate('cashier', 'fullName role')
    .populate('items.product', 'name barcode')
    .populate(
      'items.batchAllocations.batch',
      'batchNumber expirationDate'
    )
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .skip((safePage - 1) * safeLimit);

  const total = await Sale.countDocuments(filter);

  res.json({
    sales,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(
        1,
        Math.ceil(total / safeLimit)
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

  const allowedPaymentMethods = [
    'cash',
    'card',
    'gcash',
    'paymaya'
  ];

  if (
    !allowedPaymentMethods.includes(paymentMethod)
  ) {
    return res.status(400).json({
      message: 'Invalid payment method'
    });
  }

  const io = req.app.get('io');
  const session = await Product.startSession();

  let sale = null;
  let stockMovements = [];
  let preparedItems = [];

  try {
    session.startTransaction();

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
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        const error = new Error(
          'Quantity must be a whole number greater than zero'
        );

        error.statusCode = 400;
        throw error;
      }

      if (
        Number(product.currentStock || 0) < quantity
      ) {
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
          [
            {
              product: product._id,
              account: req.account._id,
              movementType: 'stock_adjustment',
              quantityChanged: -quantity,
              previousStock,
              newStock,
              reason: 'POS sale',
              branch: product.branch,
              batchAllocations
            }
          ],
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

    const receiptNumber = await generateReceiptNumber(
      session
    );

    const createdSale = await Sale.create(
      [
        {
          cashier: req.account._id,
          receiptNumber,
          items: saleItems,
          totalAmount,
          paymentMethod,
          branch: 'Main Branch',
          status: 'completed'
        }
      ],
      { session }
    );

    sale = createdSale[0];

    await writeAudit({
      req,
      account: req.account,
      action: 'sale_completed',
      affectedRecord: sale._id.toString(),
      metadata: {
        receiptNumber,
        totalAmount,
        itemCount: saleItems.length,
        stockMovementIds: stockMovements.map(
          movement => movement._id.toString()
        )
      },
      session
    });

    await session.commitTransaction();

    const saleForReceipt = await Sale.findById(sale._id)
      .populate('cashier', 'fullName role')
      .populate('items.product', 'name barcode')
      .populate(
        'items.batchAllocations.batch',
        'batchNumber expirationDate'
      )
      .lean();

    res.status(201).json({
      message: 'Sale completed successfully',
      receiptNumber: saleForReceipt.receiptNumber,
      sale: saleForReceipt,
      movements: stockMovements
    });

    void runPostSaleEffects({
      preparedItems,
      account: req.account,
      req,
      io,
      sale: saleForReceipt
    });
  } catch (err) {
    console.error('Create sale error:', err);

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