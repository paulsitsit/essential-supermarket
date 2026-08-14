import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import { writeAudit } from '../utils/audit.js';

export async function listSales(req, res) {
  const { page = 1, limit = 20, status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const sales = await Sale.find(filter)
    .populate('cashier', 'fullName role')
    .populate('items.product', 'name barcode')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Sale.countDocuments(filter);

  res.json({
    sales,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}

export async function createSale(req, res) {
  const { items, paymentMethod = 'cash' } = req.body;

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      message: 'At least one item is required'
    });
  }

  // Validate stock and build sale items
  const saleItems = [];
  let totalAmount = 0;

  for (const it of items) {
    const product = await Product.findById(it.productId);
    if (!product || product.isArchived) {
      return res.status(400).json({
        message: `Product ${it.productId || ''} not found`
      });
    }

    const qty = Number(it.quantity || 0);
    if (qty <= 0) {
      return res.status(400).json({
        message: 'Quantity must be positive'
      });
    }

    if (product.currentStock < qty) {
      return res.status(400).json({
        message: `Insufficient stock for ${product.name}`
      });
    }

    const unitPrice = Number(it.unitPrice ?? product.costPrice);
    const subtotal = unitPrice * qty;

    saleItems.push({
      product: product._id,
      name: product.name,
      barcode: product.barcode,
      quantity: qty,
      unitPrice,
      subtotal
    });

    totalAmount += subtotal;

    // Decrease stock
    product.currentStock -= qty;
    await product.save();
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
      itemCount: saleItems.length
    }
  });

  req.app.get('io')?.emit('saleCreated', sale);

  res.status(201).json(sale);
}