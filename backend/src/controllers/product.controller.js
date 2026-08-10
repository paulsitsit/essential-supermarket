import Product from '../models/Product.js';
import { writeAudit } from '../utils/audit.js';
import {
  createOrUpdateAlert
} from '../services/inventory.service.js';
import {
  createOrUpdateExpirationAlert,
  resolveExpirationAlert
} from '../services/expirationAlert.service.js';
import { generateInternalBarcode } from '../utils/barcode.js';

export async function listProducts(req, res) {
  const {
    search,
    status,
    category,
    supplier,
    includeArchived = 'false'
  } = req.query;

  const filter =
    includeArchived === 'true'
      ? {}
      : { isArchived: false };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (supplier) filter.supplier = supplier;

  if (search) {
    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const searchRegex = new RegExp(
      escapedSearch,
      'i'
    );

    filter.$or = [
      { name: searchRegex },
      { barcode: searchRegex },
      { sku: searchRegex }
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
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.json(product);
}

export async function scanProduct(req, res) {
  const rawCode = String(
    req.params.barcode || ''
  ).trim();

  if (!rawCode) {
    return res.status(400).json({
      message: 'A barcode or QR code is required'
    });
  }

  const upper = rawCode.toUpperCase();

  const product = await Product.findOne({
    $or: [
      { barcode: upper },
      { sku: upper },
      { qrCode: rawCode },
      { qrCode: upper }
    ]
  }).populate(
    'category supplier',
    'name'
  );

  if (!product || product.isArchived) {
    return res.status(404).json({
      message:
        'Product not found. Only the Admin can register a new product. Please contact the Admin before receiving this product.'
    });
  }

  res.json(product);
}

export async function createProduct(req, res) {
  const generatedBarcode =
    req.body.barcode?.trim().toUpperCase() ||
    await generateInternalBarcode();

  const data = {
    ...req.body,
    barcode: generatedBarcode,
    sku: req.body.sku?.trim().toUpperCase(),
    qrCode: req.body.qrCode || generatedBarcode,
    createdBy: req.account._id
  };

  if (!data.name || !data.sku) {
    return res.status(400).json({
      message: 'Name and SKU are required'
    });
  }

  if (
    Number(data.currentStock || 0) < 0 ||
    Number(data.reorderLevel || 0) < 0 ||
    Number(data.costPrice || 0) < 0
  ) {
    return res.status(400).json({
      message: 'Inventory values cannot be negative'
    });
  }

  const product = await Product.create(data);

  if (
    Number(product.currentStock) <=
    Number(product.reorderLevel)
  ) {
    await createOrUpdateAlert(
      product,
      req.account,
      req,
      req.app.get('io')
    );
  }

  await createOrUpdateExpirationAlert(
    product,
    req.account,
    req,
    req.app.get('io')
  );

  if (product.currentStock > 0) {
    await writeAudit({
      req,
      account: req.account,
      action:
        'product_created_with_initial_stock',
      affectedRecord: product._id.toString(),
      metadata: {
        quantity: product.currentStock
      }
    });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_created',
    affectedRecord: product._id.toString()
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

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
    Object.entries(req.body).filter(([key]) =>
      allowed.includes(key)
    )
  );

  if (updates.barcode) {
    updates.barcode = updates.barcode
      .trim()
      .toUpperCase();
  }

  if (updates.sku) {
    updates.sku = updates.sku
      .trim()
      .toUpperCase();
  }

  if (
    updates.reorderLevel !== undefined &&
    Number(updates.reorderLevel) < 0
  ) {
    return res.status(400).json({
      message: 'Reorder level cannot be negative'
    });
  }

  if (
    updates.costPrice !== undefined &&
    Number(updates.costPrice) < 0
  ) {
    return res.status(400).json({
      message: 'Cost price cannot be negative'
    });
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    updates,
    {
      new: true,
      runValidators: true
    }
  );

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  await createOrUpdateExpirationAlert(
    product,
    req.account,
    req,
    req.app.get('io')
  );

  await writeAudit({
    req,
    account: req.account,
    action: 'product_updated',
    affectedRecord: product._id.toString(),
    metadata: {
      changedFields: Object.keys(updates)
    }
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

  res.json(product);
}

export async function archiveProduct(req, res) {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      isArchived: true
    },
    {
      new: true
    }
  );

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  await resolveExpirationAlert(
    product._id,
    req.account,
    req,
    req.app.get('io')
  );

  await writeAudit({
    req,
    account: req.account,
    action: 'product_archived',
    affectedRecord: product._id.toString()
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

  res.json({
    message: 'Product archived',
    product
  });
}

export async function deleteProduct(req, res) {
  const product = await Product.findById(
    req.params.id
  );

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  await resolveExpirationAlert(
    product._id,
    req.account,
    req,
    req.app.get('io')
  );

  await Product.findByIdAndDelete(
    req.params.id
  );

  await writeAudit({
    req,
    account: req.account,
    action: 'product_deleted',
    affectedRecord: req.params.id
  });

  req.app.get('io')?.emit(
    'productUpdated',
    {
      _id: product._id,
      deleted: true
    }
  );

  res.json({
    message: 'Product deleted'
  });
}