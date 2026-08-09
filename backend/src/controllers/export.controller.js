import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import { writeAudit } from '../utils/audit.js';

function productFilter(query) {
  const filter = {
    isArchived: false
  };

  if (query.category) filter.category = query.category;
  if (query.supplier) filter.supplier = query.supplier;
  if (query.status) filter.status = query.status;
  if (query.branch) filter.branch = query.branch;
  if (query.product) filter._id = query.product;

  return filter;
}

export async function inventory(req, res) {
  const products = await Product.find(productFilter(req.query))
    .populate('category supplier', 'name')
    .sort({ name: 1 });

  await writeAudit({
    req,
    account: req.account,
    action: 'report_exported',
    affectedRecord: 'inventory'
  });

  return res.json({
    report: 'Current Inventory Report',
    generatedAt: new Date(),
    rows: products
  });
}

export async function lowStock(req, res) {
  const rows = await Product.find({
    ...productFilter(req.query),
    status: {
      $in: ['low_stock', 'out_of_stock']
    }
  })
    .populate('category supplier', 'name')
    .sort({ currentStock: 1 });

  await writeAudit({
    req,
    account: req.account,
    action: 'report_exported',
    affectedRecord: 'low_stock'
  });

  return res.json({
    report: 'Low-Stock Report',
    generatedAt: new Date(),
    rows
  });
}

export async function movements(req, res) {
  const filter = {};

  if (req.query.product) {
    filter.product = req.query.product;
  }

  if (req.query.account) {
    filter.account = req.query.account;
  }

  if (req.query.movementType) {
    filter.movementType = req.query.movementType;
  }

  if (req.query.from || req.query.to) {
    filter.createdAt = {};

    if (req.query.from) {
      filter.createdAt.$gte = new Date(req.query.from);
    }

    if (req.query.to) {
      filter.createdAt.$lte = new Date(
        `${req.query.to}T23:59:59.999Z`
      );
    }
  }

  const rows = await StockMovement.find(filter)
    .populate('product', 'name barcode sku')
    .populate('account', 'fullName role')
    .sort({ createdAt: -1 });

  await writeAudit({
    req,
    account: req.account,
    action: 'report_exported',
    affectedRecord: 'movements'
  });

  return res.json({
    report: 'Stock Movement Report',
    generatedAt: new Date(),
    rows
  });
}

export async function exportReport(req, res, next) {
  const handlers = {
    inventory,
    'low-stock': lowStock,
    lowStock,
    movements
  };

  const handler = handlers[req.params.type];

  if (!handler) {
    return res.status(404).json({
      message: `Unknown export type: ${req.params.type}`,
      availableTypes: ['inventory', 'low-stock', 'movements']
    });
  }

  try {
    return await handler(req, res);
  } catch (error) {
    return next(error);
  }
}