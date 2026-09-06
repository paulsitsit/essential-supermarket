import Product from '../models/Product.js';
import { writeAudit } from '../utils/audit.js';

import {
  createOrUpdateAlert
} from '../services/inventory.service.js';

import ProductBatch from '../models/ProductBatch.js';

import {
  removeBatchesForProduct
} from '../services/batch.service.js';

import {
  syncExpirationAlertsForProduct
} from '../services/expirationAlert.service.js';

import ExpirationAlert from '../models/ExpirationAlert.js';

import {
  generateInternalBarcode
} from '../utils/barcode.js';

import {
  generateUniqueSku
} from '../utils/sku.js';

import multer from 'multer';

import {
  recognizeProductImage
} from '../utils/huggingFaceClient.js';

const upload = multer({
  storage: multer.memoryStorage()
});

async function fetchOpenFoodFactsProduct(barcode) {
  const fields = [
    'code',
    'product_name',
    'product_name_en',
    'generic_name',
    'brands',
    'categories',
    'quantity',
    'ingredients_text',
    'image_url',
    'packaging',
    'countries',
    'stores'
  ].join(',');

  const url =
    `https://world.openfoodfacts.org/api/v2/product/${barcode}` +
    `?fields=${fields}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'EssentialSupermarket/1.0'
    }
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();

  if (result.status !== 1 || !result.product) {
    return null;
  }

  const product = result.product;

  return {
    source: 'openfoodfacts',
    found: true,
    product: {
      barcode: product.code || barcode,
      name:
        product.product_name_en ||
        product.product_name ||
        product.generic_name ||
        '',
      brand: product.brands || '',
      description: product.ingredients_text || '',
      quantity: product.quantity || '',
      categoryText: product.categories || '',
      imageUrl: product.image_url || '',
      packaging: product.packaging || '',
      countries: product.countries || '',
      stores: product.stores || ''
    }
  };
}

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

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (supplier) {
    filter.supplier = supplier;
  }

  if (search) {
    const escapedSearch = String(search).replace(
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
  const product = await Product.findById(
    req.params.id
  ).populate('category supplier', 'name');

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.json(product);
}

/*
 * POS-only product lookup.
 *
 * This is used by the separate Cashier POS application:
 * GET /api/products/scan/:barcode
 *
 * The route controls access. It should allow:
 * admin, manager, staff, cashier
 *
 * Do not return sensitive inventory information to Cashier:
 * - costPrice
 * - supplier
 * - reorderLevel
 * - full batch records
 * - stock history
 */
export async function scanProduct(req, res) {
  const rawCode = String(
    req.params.barcode || ''
  ).trim();

  if (!rawCode) {
    return res.status(400).json({
      message: 'A barcode or QR code is required'
    });
  }

  const upperCode = rawCode.toUpperCase();

  const product = await Product.findOne({
    $or: [
      { barcode: upperCode },
      { sku: upperCode },
      { qrCode: rawCode },
      { qrCode: upperCode }
    ],
    isArchived: false
  })
    .select(
      [
        '_id',
        'name',
        'barcode',
        'sku',
        'qrCode',
        'brand',
        'category',
        'sellingPrice',
        'price',
        'currentStock',
        'unitType'
      ].join(' ')
    )
    .populate('category', 'name')
    .lean();

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  /*
   * The POS needs the price and current stock only to show
   * the cashier what is being sold. Final stock validation
   * happens again in createSale() at checkout.
   */
  const sellingPrice = Number(
    product.sellingPrice ??
      product.price ??
      0
  );

  res.json({
    id: product._id,
    name: product.name,
    barcode: product.barcode || '',
    sku: product.sku || '',
    qrCode: product.qrCode || '',
    brand: product.brand || '',
    category: product.category?.name || '',
    sellingPrice: Number.isFinite(sellingPrice)
      ? sellingPrice
      : 0,
    currentStock: Number(product.currentStock || 0),
    unitType: product.unitType || 'piece'
  });
}

export async function getProductBatches(req, res) {
  const product = await Product.findById(
    req.params.id
  ).populate('category supplier', 'name');

  if (!product || product.isArchived) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const batches = await ProductBatch.find({
    product: product._id,
    quantity: {
      $gt: 0
    }
  }).sort({
    expirationDate: 1,
    receivedDate: 1,
    createdAt: 1
  });

  res.json({
    product,
    batches
  });
}

export async function lookupExternalProduct(req, res) {
  const barcode = String(
    req.params.barcode || ''
  ).trim();

  if (!barcode) {
    return res.status(400).json({
      message: 'A barcode is required'
    });
  }

  if (!/^\d{8,14}$/.test(barcode)) {
    return res.status(400).json({
      message: 'Invalid barcode format'
    });
  }

  try {
    const result =
      await fetchOpenFoodFactsProduct(barcode);

    if (!result || !result.product) {
      return res.status(404).json({
        message:
          'Product was not found in Open Food Facts'
      });
    }

    res.json(result);
  } catch (error) {
    console.error(
      'Open Food Facts lookup failed:',
      error
    );

    res.status(502).json({
      message:
        'Unable to connect to Open Food Facts'
    });
  }
}

export async function recognizeProduct(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message:
          'No image file received. Please choose a JPG or PNG image under a few MB and try again.'
      });
    }

    const imageBuffer = req.file.buffer;

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({
        message:
          'Uploaded image is empty. Please try again with a different file.'
      });
    }

    const product =
      await recognizeProductImage(imageBuffer);

    return res.status(200).json({
      source: 'huggingface-vision',
      matched: Boolean(product.productName),
      productName: product.productName || '',
      brand: product.brand || '',
      category: product.category || '',
      variant: product.variant || '',
      description: product.description || ''
    });
  } catch (error) {
    console.error(
      'Hugging Face recognition error:',
      error
    );

    return res.status(502).json({
      message: 'Unable to analyze the image',
      error: error.message || 'Unknown error'
    });
  }
}

export async function createProduct(req, res) {
  const requestedBarcode = String(
    req.body.barcode || ''
  )
    .trim()
    .toUpperCase();

  const requestedSku = String(
    req.body.sku || ''
  )
    .trim()
    .toUpperCase();

  const barcode =
    requestedBarcode ||
    (await generateInternalBarcode());

  const sku =
    requestedSku ||
    (await generateUniqueSku());

  const data = {
    ...req.body,
    barcode,
    sku,
    qrCode:
      String(req.body.qrCode || '').trim() ||
      barcode,
    createdBy: req.account._id
  };

  if (!data.name?.trim()) {
    return res.status(400).json({
      message: 'Product name is required'
    });
  }

  if (
    Number(data.currentStock || 0) < 0 ||
    Number(data.reorderLevel || 0) < 0 ||
    Number(data.costPrice || 0) < 0
  ) {
    return res.status(400).json({
      message:
        'Inventory values cannot be negative'
    });
  }

  let product;

  try {
    product = await Product.create(data);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || {}
      )[0];

      if (duplicateField === 'sku') {
        return res.status(409).json({
          message:
            'This SKU already exists. Please try again.'
        });
      }

      if (duplicateField === 'barcode') {
        return res.status(409).json({
          message:
            'This barcode already exists.'
        });
      }

      return res.status(409).json({
        message:
          'A product with this information already exists.'
      });
    }

    throw error;
  }

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
    affectedRecord: product._id.toString(),
    metadata: {
      sku: product.sku,
      barcode: product.barcode
    }
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
    'costPrice'
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) =>
      allowed.includes(key)
    )
  );

  if (updates.name !== undefined) {
    updates.name = String(
      updates.name
    ).trim();
  }

  if (updates.barcode !== undefined) {
    const value = String(
      updates.barcode || ''
    )
      .trim()
      .toUpperCase();

    if (value) {
      updates.barcode = value;
    } else {
      delete updates.barcode;
    }
  }

  if (updates.sku !== undefined) {
    const value = String(
      updates.sku || ''
    )
      .trim()
      .toUpperCase();

    if (value) {
      updates.sku = value;
    } else {
      delete updates.sku;
    }
  }

  if (updates.qrCode !== undefined) {
    const value = String(
      updates.qrCode || ''
    ).trim();

    if (value) {
      updates.qrCode = value;
    } else {
      delete updates.qrCode;
    }
  }

  if (
    updates.reorderLevel !== undefined &&
    Number(updates.reorderLevel) < 0
  ) {
    return res.status(400).json({
      message:
        'Reorder level cannot be negative'
    });
  }

  if (
    updates.costPrice !== undefined &&
    Number(updates.costPrice) < 0
  ) {
    return res.status(400).json({
      message:
        'Cost price cannot be negative'
    });
  }

  let product;

  try {
    product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || {}
      )[0];

      return res.status(409).json({
        message:
          duplicateField === 'sku'
            ? 'This SKU already exists.'
            : 'This barcode already exists.'
      });
    }

    throw error;
  }

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

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
    { isArchived: true },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  await syncExpirationAlertsForProduct(
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

  await removeBatchesForProduct(product._id);

  await ExpirationAlert.deleteMany({
    product: product._id
  });

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

export const uploadProductImage =
  upload.single('image');