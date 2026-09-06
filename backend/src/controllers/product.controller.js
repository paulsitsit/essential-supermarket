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

/*
 * Maximum accepted original image file size.
 *
 * 5 MB is a reasonable limit when the image is converted to Base64
 * and stored in Product.imageUrl in MongoDB.
 *
 * A 5 MB original image becomes roughly 6.7 MB after Base64 encoding,
 * which remains below MongoDB's 16 MB maximum document size.
 */
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES
  },
  fileFilter: (req, file, callback) => {
    if (!allowedImageMimeTypes.includes(file.mimetype)) {
      const error = new Error(
        'Only JPG, PNG, and WebP image files are allowed.'
      );

      error.statusCode = 400;

      return callback(error);
    }

    callback(null, true);
  }
});

/*
 * Wrapper around Multer so upload-size and upload-type errors return
 * clean client responses rather than generic 500 errors.
 *
 * The frontend submits the image under exactly this field name:
 * image
 */
export function uploadProductImage(
  req,
  res,
  next
) {
  upload.single('image')(req, res, error => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message:
            'Image must be 5 MB or smaller. Please choose a smaller photo or reduce its size before uploading.'
        });
      }

      return res.status(400).json({
        message:
          'Unable to upload the image. Please choose a JPG, PNG, or WebP image and try again.'
      });
    }

    return res.status(
      error.statusCode || 400
    ).json({
      message:
        error.message ||
        'Unable to upload the image.'
    });
  });
}

function getImageDataUrl(file) {
  if (!file?.buffer?.length) {
    return '';
  }

  const mimeType = allowedImageMimeTypes.includes(
    file.mimetype
  )
    ? file.mimetype
    : 'image/jpeg';

  const base64 = file.buffer.toString('base64');

  return `data:${mimeType};base64,${base64}`;
}

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
        'imageUrl',
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
    imageUrl: product.imageUrl || '',
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

/*
 * Analyzes a product image to suggest a name, brand, and description.
 * It does not permanently save the image.
 */
export async function recognizeProduct(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message:
          'No image file received. Choose a JPG, PNG, or WebP image that is 5 MB or smaller and try again.'
      });
    }

    const imageBuffer = req.file.buffer;

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({
        message:
          'Uploaded image is empty. Please try another file.'
      });
    }

    const product =
      await recognizeProductImage(imageBuffer);

    return res.status(200).json({
      source: 'huggingface-vision',
      matched: Boolean(product?.productName),
      productName: product?.productName || '',
      brand: product?.brand || '',
      category: product?.category || '',
      variant: product?.variant || '',
      description: product?.description || ''
    });
  } catch (error) {
    console.error(
      'Hugging Face recognition error:',
      error
    );

    return res.status(502).json({
      message:
        'Unable to analyze the image. The photo is still available to attach when you save the product.',
      error: error.message || 'Unknown error'
    });
  }
}

/*
 * Saves a permanent product image.
 *
 * The image is stored in MongoDB as a Base64 data URL in Product.imageUrl.
 * A 5 MB original image becomes around 6.7 MB Base64, remaining below
 * MongoDB's 16 MB document-size limit.
 */
export async function saveProductImage(req, res) {
  if (!req.file) {
    return res.status(400).json({
      message:
        'No image file received. Choose a JPG, PNG, or WebP image that is 5 MB or smaller.'
    });
  }

  const product = await Product.findById(
    req.params.id
  );

  if (!product || product.isArchived) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const imageUrl = getImageDataUrl(req.file);

  if (!imageUrl) {
    return res.status(400).json({
      message:
        'The uploaded image could not be processed.'
    });
  }

  product.imageUrl = imageUrl;

  await product.save();

  await writeAudit({
    req,
    account: req.account,
    action: 'product_image_uploaded',
    affectedRecord: product._id.toString(),
    metadata: {
      fileName: req.file.originalname || '',
      mimeType: req.file.mimetype || '',
      sizeBytes: req.file.size || 0,
      maxSizeBytes: MAX_IMAGE_SIZE_BYTES
    }
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

  res.json({
    message: 'Product image saved',
    product
  });
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
    Number(data.costPrice || 0) < 0 ||
    Number(data.sellingPrice || 0) < 0
  ) {
    return res.status(400).json({
      message:
        'Inventory values and prices cannot be negative'
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
    'costPrice',
    'sellingPrice'
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

  if (
    updates.sellingPrice !== undefined &&
    Number(updates.sellingPrice) < 0
  ) {
    return res.status(400).json({
      message:
        'Selling price cannot be negative'
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