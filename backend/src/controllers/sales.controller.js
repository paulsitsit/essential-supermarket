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

  /*
   * First validate every product and requested quantity
   * before reducing any batch stock.
   */
  const preparedItems = [];

  for (const item of items) {
    const product = await Product.findById(
      item.productId
    );

    if (!product || product.isArchived) {
      return res.status(400).json({
        message:
          `Product ${item.productId || ''} not found`
      });
    }

    const quantity = Number(item.quantity || 0);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        message:
          'Quantity must be greater than zero'
      });
    }

    if (product.currentStock < quantity) {
      return res.status(409).json({
        message:
          `Insufficient stock for ${product.name}`
      });
    }

    const unitPrice = Number(
      item.unitPrice ?? product.costPrice
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      return res.status(400).json({
        message:
          `Invalid unit price for ${product.name}`
      });
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

  for (const item of preparedItems) {
    const {
      product,
      quantity,
      unitPrice,
      subtotal
    } = item;

    /*
     * FEFO batch deduction:
     * earliest expiry is deducted first.
     */
    const batchAllocations =
      await allocateBatchesFEFO({
        product,
        quantity
      });

    const previousStock = Number(
      product.currentStock || 0
    );

    const newStock = previousStock - quantity;

    if (newStock < 0) {
      return res.status(409).json({
        message:
          `Stock cannot become negative for ${product.name}`
      });
    }

    product.currentStock = newStock;
    await product.save();

    const movement = await StockMovement.create({
      product: product._id,
      account: req.account._id,
      movementType: 'stock_adjustment',
      quantityChanged: -quantity,
      previousStock,
      newStock,
      reason: 'POS sale',
      branch: product.branch,
      batchAllocations
    });

    stockMovements.push(movement);

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

    await createOrUpdateAlert(
      product,
      req.account,
      req,
      req.app.get('io')
    );

    await syncExpirationAlertsForProduct(
      product._id,
      req.account,
      req,
      req.app.get('io')
    );

    req.app.get('io')?.emit(
      'productUpdated',
      product
    );

    req.app.get('io')?.emit('stockUpdated', {
      product,
      movement
    });

    req.app.get('io')?.emit('batchUpdated', {
      productId: product._id.toString(),
      batchAllocations
    });
  }

  const sale = await Sale.create({
    cashier: req.account._id,
    items: saleItems,
    totalAmount,
    paymentMethod,
    status: 'completed'
  });

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
    }
  });

  req.app.get('io')?.emit('saleCreated', sale);

  res.status(201).json({
    sale,
    movements: stockMovements
  });
}