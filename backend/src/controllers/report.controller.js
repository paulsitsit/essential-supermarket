import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
import ProductBatch from '../models/ProductBatch.js';
import { writeAudit } from '../utils/audit.js';

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
  const products = await Product.find(productFilter(req.query)).populate('category supplier', 'name').sort({ name: 1 });
  await writeAudit({ req, account: req.account, action: 'report_exported', affectedRecord: 'inventory' });
  res.json({ report: 'Current Inventory Report', generatedAt: new Date(), rows: products });
}
export async function lowStock(req, res) { const rows = await Product.find({ ...productFilter(req.query), status: { $in: ['low_stock', 'out_of_stock'] } }).populate('category supplier', 'name').sort({ currentStock: 1 }); res.json({ report: 'Low-Stock Report', rows }); }
export async function movements(req, res) {
  const filter = {};
  if (req.query.product) filter.product = req.query.product;
  if (req.query.account) filter.account = req.query.account;
  if (req.query.movementType) filter.movementType = req.query.movementType;
  if (req.query.from || req.query.to) { filter.createdAt = {}; if (req.query.from) filter.createdAt.$gte = new Date(req.query.from); if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`); }
  const rows = await StockMovement.find(filter).populate('product', 'name barcode sku').populate('account', 'fullName role').sort({ createdAt: -1 });
  res.json({ report: 'Stock Movement Report', rows });
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

  // Batches expiring between today and limitDate (inclusive), with quantity > 0
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

  // Compute summary counts
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