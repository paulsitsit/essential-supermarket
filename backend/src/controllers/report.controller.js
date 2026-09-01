import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
import ProductBatch from '../models/ProductBatch.js';
import { writeAudit } from '../utils/audit.js';
import Sale from '../models/Sale.js';
import SaleReturn from '../models/SaleReturn.js';

function productFilter(query) {
  const filter = { isArchived: false };
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

  res.json({
    report: 'Current Inventory Report',
    generatedAt: new Date(),
    rows: products
  });
}

export async function lowStock(req, res) {
  const rows = await Product.find({
    ...productFilter(req.query),
    status: { $in: ['low_stock', 'out_of_stock'] }
  })
    .populate('category supplier', 'name')
    .sort({ currentStock: 1 });

  res.json({
    report: 'Low-Stock Report',
    rows
  });
}

export async function movements(req, res) {
  const filter = {};

  if (req.query.product) filter.product = req.query.product;
  if (req.query.account) filter.account = req.query.account;
  if (req.query.movementType) filter.movementType = req.query.movementType;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }

  const rows = await StockMovement.find(filter)
    .populate('product', 'name barcode sku')
    .populate('account', 'fullName role')
    .sort({ createdAt: -1 });

  res.json({
    report: 'Stock Movement Report',
    rows
  });
}

export async function getExpiringSoon(req, res) {
  const {
    days = 30,
    search
  } = req.query;

  const maxDays = Number(days) || 30;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() + maxDays);

  let productQuery = Product.find(productFilter(req.query));

  if (search) {
    productQuery = productQuery.where('name').regex(new RegExp(search, 'i'));
  }

  const products = await productQuery
    .select('_id name category supplier barcode sku')
    .lean();

  const productIds = products.map(p => p._id);

  const productsMap = Object.fromEntries(
    products.map(p => [p._id.toString(), p])
  );

  const batches = await ProductBatch.find({
    product: { $in: productIds },
    quantity: { $gt: 0 },
    expirationDate: {
      $gte: today,
      $lte: limitDate
    }
  })
    .sort({ expirationDate: 1, receivedDate: 1 })
    .lean();

  const rows = batches.map(batch => {
    const product = productsMap[batch.product.toString()] || {};

    const exp = batch.expirationDate
      ? new Date(batch.expirationDate)
      : null;

    const daysLeft = exp
      ? Math.ceil(
          (exp.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return {
      _id: batch._id,
      batchNumber: batch.batchNumber,
      productId: batch.product,
      productName: product.name,
      productBarcode: product.barcode,
      productSku: product.sku,
      category: product.category,
      supplier: product.supplier,
      quantity: batch.quantity,
      expirationDate: batch.expirationDate,
      daysLeft
    };
  });

  const summary = {
    within0to7: 0,
    within8to14: 0,
    within15to30: 0
  };

  for (const row of rows) {
    const d = row.daysLeft;
    if (d == null) continue;
    if (d >= 0 && d <= 7) summary.within0to7++;
    else if (d >= 8 && d <= 14) summary.within8to14++;
    else if (d >= 15 && d <= 30) summary.within15to30++;
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'report_exported',
    affectedRecord: 'expiring_soon'
  });

  res.json({
    report: 'Expiring Soon Report',
    generatedAt: new Date(),
    summary,
    rows,
    filters: {
      days: maxDays,
      category: req.query.category,
      supplier: req.query.supplier,
      search
    }
  });
}

export async function salesReturns(req, res) {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Both "from" and "to" date parameters are required'
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (toDate < fromDate) {
      return res.status(400).json({
        error: '"to" date cannot be before "from" date'
      });
    }

    const salesByDayAgg = await Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: fromDate,
            $lte: toDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          grossSales: { $sum: '$totalAmount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const refundsByDayAgg = await SaleReturn.aggregate([
      {
        $match: {
          createdAt: {
            $gte: fromDate,
            $lte: toDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          refunds: { $sum: '$totalRefund' },
          returnsCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const salesMap = new Map();
    for (const row of salesByDayAgg) {
      const key = `${row._id.year}-${row._id.month}-${row._id.day}`;
      salesMap.set(key, {
        grossSales: row.grossSales || 0,
        transactions: row.transactions || 0
      });
    }

    const refundsMap = new Map();
    for (const row of refundsByDayAgg) {
      const key = `${row._id.year}-${row._id.month}-${row._id.day}`;
      refundsMap.set(key, {
        refunds: row.refunds || 0,
        returnsCount: row.returnsCount || 0
      });
    }

    const days = [];
    const cursor = new Date(fromDate);
    cursor.setHours(0, 0, 0, 0);

    const endCursor = new Date(toDate);
    endCursor.setHours(23, 59, 59, 999);

    while (cursor <= endCursor) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const day = cursor.getDate();

      const key = `${year}-${month}-${day}`;

      const salesRow = salesMap.get(key) || {
        grossSales: 0,
        transactions: 0
      };

      const refundsRow = refundsMap.get(key) || {
        refunds: 0,
        returnsCount: 0
      };

      const grossSales = salesRow.grossSales || 0;
      const refunds = refundsRow.refunds || 0;
      const netRevenue = Math.max(grossSales - refunds, 0);

      days.push({
        date: new Date(year, month - 1, day),
        grossSales,
        refunds,
        netRevenue,
        transactions: salesRow.transactions || 0,
        returnsCount: refundsRow.returnsCount || 0
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const summary = days.reduce(
      (acc, day) => {
        acc.grossSales += day.grossSales;
        acc.refunds += day.refunds;
        acc.netRevenue += day.netRevenue;
        acc.transactions += day.transactions;
        acc.returnsCount += day.returnsCount;
        return acc;
      },
      {
        grossSales: 0,
        refunds: 0,
        netRevenue: 0,
        transactions: 0,
        returnsCount: 0
      }
    );

    summary.averageReturn =
      summary.returnsCount > 0
        ? summary.refunds / summary.returnsCount
        : 0;

    const rows = days.map(day => ({
      date: day.date.toISOString().split('T')[0],
      grossSales: day.grossSales,
      refunds: day.refunds,
      netRevenue: day.netRevenue,
      transactions: day.transactions,
      returnsCount: day.returnsCount
    }));

    await writeAudit({
      req,
      account: req.account,
      action: 'report_exported',
      affectedRecord: 'sales_returns'
    });

    res.json({
      report: 'Sales & Returns Report',
      generatedAt: new Date(),
      filters: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      },
      summary,
      rows
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Unable to generate sales & returns report'
    });
  }
}