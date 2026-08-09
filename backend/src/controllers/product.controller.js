import Product from '../models/Product.js';
import { writeAudit } from '../utils/audit.js';
import { createOrUpdateAlert } from '../services/inventory.service.js';
import { generateInternalBarcode } from '../utils/barcode.js';

export async function listProducts(req, res) {
  const { search, status, category, supplier, includeArchived = 'false' } = req.query;

  const filter = includeArchived === 'true' ? {} : { isArchived: false };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (supplier) filter.supplier = supplier;

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { barcode: new RegExp(search, 'i') },
      { sku: new RegExp(search, 'i') }
    ];
  }

  const products = await Product.find(filter)
    .populate('category supplier', 'name')
    .sort({ updatedAt: -1 });

  res.json(products);
}

export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id)
    .populate('category supplier', 'name');

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json(product);
}

export async function scanProduct(req, res) {
  const code = req.params.barcode;
  const upper = code.toUpperCase();

  const product = await Product.findOne({
    $or: [
      { barcode: upper },
      { sku: upper },
      { qrCode: code }
    ]
  }).populate('category supplier', 'name');

  if (!product || product.isArchived) {
    return res.status(404).json({
      message:
        'Product not found. Only the Admin can register a new product. Please contact the Admin before receiving this product.'
    });
  }

  res.json(product);
}

export async function createProduct(req, res) {
  const data = {
    ...req.body,
    barcode:
      req.body.barcode?.trim().toUpperCase() ||
      (await generateInternalBarcode()),
    sku: req.body.sku?.trim().toUpperCase(),
    qrCode: req.body.qrCode || req.body.barcode,
    createdBy: req.account._id
  };

  if (!data.name || !data.sku) {
    return res.status(400).json({ message: 'Name and SKU are required' });
  }

  if (
    Number(data.currentStock) < 0 ||
    Number(data.reorderLevel) < 0 ||
    Number(data.costPrice) < 0
  ) {
    return res
      .status(400)
      .json({ message: 'Inventory values cannot be negative' });
  }

  const product = await Product.create(data);

  if (product.currentStock <= product.reorderLevel) {
    await createOrUpdateAlert(
      product,
      req.account,
      req,
      req.app.get('io')
    );
  }

  if (product.currentStock > 0) {
    await writeAudit({
      req,
      account: req.account,
      action: 'product_created_with_initial_stock',
      affectedRecord: product._id.toString(),
      metadata: { quantity: product.currentStock }
    });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_created',
    affectedRecord: product._id.toString()
  });

  req.app.get('io')?.emit('productUpdated', product);

  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  const allowed = [
    'name',
    'barcode',
    'sku',
    'qrCode',
    'category',
    'supplier',
    'brand',
    'description',
    'imageUrl',
    'unitType',
    'branch',
    'reorderLevel',
    'costPrice',
    'expirationDate'
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowed.includes(key))
  );

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_updated',
    affectedRecord: product._id.toString()
  });

  req.app.get('io')?.emit('productUpdated', product);

  res.json(product);
}

export async function archiveProduct(req, res) {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isArchived: true },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_archived',
    affectedRecord: product._id.toString()
  });

  res.json({ message: 'Product archived' });
}

export async function deleteProduct(req, res) {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_deleted',
    affectedRecord: req.params.id
  });

  res.json({ message: 'Product deleted' });
}