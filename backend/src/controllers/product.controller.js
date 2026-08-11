// backend/src/controllers/product.controller.js
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
import { generateUniqueSku } from '../utils/sku.js';

import multer from 'multer';
import {
  classifyImage,
  zeroShotClassifyImage
} from '../utils/huggingFaceClient.js';
import { buildProductLabel } from '../utils/productLabels.js';

const upload = multer({ storage: multer.memoryStorage() });

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

  const lookupUrl =
    `https://world.openfoodfacts.org/api/v2/product/${barcode}` +
    `?fields=${fields}`;

  const response = await fetch(lookupUrl, {
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

  const external = result.product;

  return {
    source: 'openfoodfacts',
    found: true,
    product: {
      barcode: external.code || barcode,
      name:
        external.product_name_en ||
        external.product_name ||
        external.generic_name ||
        '',
      brand: external.brands || '',
      description: external.ingredients_text || '',
      quantity: external.quantity || '',
      categoryText: external.categories || '',
      imageUrl: external.image_url || '',
      packaging: external.packaging || '',
      countries: external.countries || '',
      stores: external.stores || ''
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
      : {
          isArchived: false
        };

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
    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const searchRegex = new RegExp(escapedSearch, 'i');

    filter.$or = [
      {
        name: searchRegex
      },
      {
        barcode: searchRegex
      },
      {
        sku: searchRegex
      }
    ];
  }

  const products = await Product.find(filter)
    .populate('category supplier', 'name')
    .sort({
      updatedAt: -1
    });

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

export async function scanProduct(req, res) {
  const rawCode = String(
    req.params.barcode || ''
  ).trim();

  if (!rawCode) {
    return res.status(400).json({
      message:
        'A barcode or QR code is required'
    });
  }

  const upperCode = rawCode.toUpperCase();

  const product = await Product.findOne({
    $or: [
      {
        barcode: upperCode
      },
      {
        sku: upperCode
      },
      {
        qrCode: rawCode
      },
      {
        qrCode: upperCode
      }
    ]
  }).populate('category supplier', 'name');

  if (!product || product.isArchived) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.json(product);
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
    const off = await fetchOpenFoodFactsProduct(barcode);

    if (!off || !off.product) {
      return res.status(404).json({
        message:
          'Product was not found in Open Food Facts'
      });
    }

    res.json(off);
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

/**
 * recognizeProduct using zero-shot image classification
 * - Returns best matching products from your inventory, not just generic labels.
 * - Uses a Hugging Face zero-shot model to compare the image against product labels.
 */
export async function recognizeProduct(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image provided'
      });
    }

    const imageBuffer = req.file.buffer;

    // 1. Pull candidate products from DB
    // Strategy: most recently updated, non-archived products.
    const candidateProducts = await Product.find({ isArchived: false })
      .sort({ updatedAt: -1 })
      .limit(150)
      .lean();

    if (candidateProducts.length === 0) {
      return res.status(400).json({
        message: 'No products available to match against'
      });
    }

    // 2. Build labels for zero-shot and map label -> product
    const labelToProduct = new Map();
    const labels = [];

    for (const p of candidateProducts) {
      const label = buildProductLabel(p);
      if (!label) continue;
      labels.push(label);
      labelToProduct.set(label, p);
    }

    if (labels.length === 0) {
      return res.status(400).json({
        message: 'No valid product labels to match against'
      });
    }

    // 3. Call Hugging Face zero-shot model
    const zsResults = await zeroShotClassifyImage(imageBuffer, labels);

    if (!zsResults.length) {
      return res.status(200).json({
        source: 'huggingface-zero-shot',
        matched: false,
        message: 'No confident match found',
        labels: []
      });
    }

    // 4. Map HF labels back to actual Product docs
    const enriched = zsResults
      .map(r => {
        const product = labelToProduct.get(r.label);
        if (!product) return null;
        return {
          score: r.score,
          product
        };
      })
      .filter(Boolean);

    if (!enriched.length) {
      return res.status(200).json({
        source: 'huggingface-zero-shot',
        matched: false,
        message: 'No products matched returned labels',
        labels: zsResults
      });
    }

    const best = enriched[0];
    const candidates = enriched.slice(1, 5); // top 5 alternatives

    return res.status(200).json({
      source: 'huggingface-zero-shot',
      matched: true,
      bestMatch: {
        ...best.product,
        score: best.score
      },
      candidates: candidates.map(c => ({
        ...c.product,
        score: c.score
      }))
    });
  } catch (error) {
    console.error('Hugging Face zero-shot recognition error:', error);
    res.status(502).json({
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
    'costPrice',
    'expirationDate'
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
    const barcode = String(
      updates.barcode || ''
    )
      .trim()
      .toUpperCase();

    if (barcode) {
      updates.barcode = barcode;
    } else {
      delete updates.barcode;
    }
  }

  if (updates.sku !== undefined) {
    const sku = String(
      updates.sku || ''
    )
      .trim()
      .toUpperCase();

    if (sku) {
      updates.sku = sku;
    } else {
      delete updates.sku;
    }
  }

  if (updates.qrCode !== undefined) {
    const qrCode = String(
      updates.qrCode || ''
    ).trim();

    if (qrCode) {
      updates.qrCode = qrCode;
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

/**
 * Multer upload middleware export for routes
 */
export const uploadProductImage = upload.single('image');