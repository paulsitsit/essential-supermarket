import multer from 'multer';
import mongoose from 'mongoose';

import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import ExpirationAlert from '../models/ExpirationAlert.js';
import SyncOperation from '../models/SyncOperation.js';

import {
  createOrUpdateAlert
} from '../services/inventory.service.js';

import {
  removeBatchesForProduct
} from '../services/batch.service.js';

import {
  syncExpirationAlertsForProduct
} from '../services/expirationAlert.service.js';

import {
  generateInternalBarcode
} from '../utils/barcode.js';

import {
  generateUniqueSku
} from '../utils/sku.js';

import {
  recognizeProductImage
} from '../utils/huggingFaceClient.js';

import {
  writeAudit
} from '../utils/audit.js';

import {
  uploadProductImage as uploadImageToCloudinary,
  deleteProductImage,
  isCloudinaryConfigured
} from '../services/cloudinary.service.js';

const MAX_IMAGE_SIZE_BYTES =
  15 * 1024 * 1024;

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
    if (
      !allowedImageMimeTypes.includes(
        file.mimetype
      )
    ) {
      const error = new Error(
        'Only JPG, PNG, and WebP image files are allowed.'
      );

      error.statusCode = 400;

      return callback(error);
    }

    callback(null, true);
  }
});

export function uploadProductImage(
  req,
  res,
  next
) {
  upload.single('image')(
    req,
    res,
    error => {
      if (!error) {
        return next();
      }

      if (
        error instanceof multer.MulterError
      ) {
        if (
          error.code === 'LIMIT_FILE_SIZE'
        ) {
          return res.status(413).json({
            message:
              'Image must be 15 MB or smaller. Please choose a smaller photo or reduce its size before uploading.'
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
    }
  );
}

async function fetchOpenFoodFactsProduct(
  barcode
) {
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
      'User-Agent':
        'EssentialSupermarket/1.0'
    }
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();

  if (
    result.status !== 1 ||
    !result.product
  ) {
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

      description:
        product.ingredients_text || '',

      quantity: product.quantity || '',

      categoryText:
        product.categories || '',

      imageUrl:
        product.image_url || '',

      packaging:
        product.packaging || '',

      countries:
        product.countries || '',

      stores:
        product.stores || ''
    }
  };
}

export async function listProducts(
  req,
  res
) {
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
    const escapedSearch = String(
      search
    ).replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const searchRegex = new RegExp(
      escapedSearch,
      'i'
    );

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

export async function getProduct(
  req,
  res
) {
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

export async function scanProduct(
  req,
  res
) {
  const rawCode = String(
    req.params.barcode || ''
  ).trim();

  if (!rawCode) {
    return res.status(400).json({
      message:
        'A barcode or QR code is required'
    });
  }

  const upperCode =
    rawCode.toUpperCase();

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
    category:
      product.category?.name || '',
    sellingPrice: Number.isFinite(
      sellingPrice
    )
      ? sellingPrice
      : 0,
    currentStock: Number(
      product.currentStock || 0
    ),
    unitType:
      product.unitType || 'piece'
  });
}

export async function getProductBatches(
  req,
  res
) {
  const product = await Product.findById(
    req.params.id
  ).populate('category supplier', 'name');

  if (
    !product ||
    product.isArchived
  ) {
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

export async function lookupExternalProduct(
  req,
  res
) {
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
      await fetchOpenFoodFactsProduct(
        barcode
      );

    if (!result?.product) {
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

export async function recognizeProduct(
  req,
  res
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message:
          'No image file received. Choose a JPG, PNG, or WebP image that is 15 MB or smaller and try again.'
      });
    }

    const imageBuffer = req.file.buffer;

    if (
      !imageBuffer ||
      imageBuffer.length === 0
    ) {
      return res.status(400).json({
        message:
          'Uploaded image is empty. Please try another file.'
      });
    }

    const product =
      await recognizeProductImage(
        imageBuffer
      );

    return res.status(200).json({
      source: 'huggingface-vision',
      matched: Boolean(
        product?.productName
      ),
      productName:
        product?.productName || '',
      brand:
        product?.brand || '',
      category:
        product?.category || '',
      variant:
        product?.variant || '',
      description:
        product?.description || ''
    });
  } catch (error) {
    console.error(
      'Hugging Face recognition error:',
      error
    );

    return res.status(502).json({
      message:
        'Unable to analyze the image. The photo is still available to attach when you save the product.',
      error:
        error.message || 'Unknown error'
    });
  }
}

export async function saveProductImage(
  req,
  res
) {
  if (!req.file) {
    return res.status(400).json({
      message:
        'No image file received. Choose a JPG, PNG, or WebP image that is 15 MB or smaller.'
    });
  }

  if (!isCloudinaryConfigured()) {
    return res.status(503).json({
      message:
        'Product image storage is not configured. Please contact an administrator.'
    });
  }

  const product = await Product.findById(
    req.params.id
  );

  if (
    !product ||
    product.isArchived
  ) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  let uploaded;

  try {
    uploaded =
      await uploadImageToCloudinary(
        req.file.buffer,
        req.file.originalname
      );
  } catch (error) {
    console.error(
      'Cloudinary product image upload failed:',
      error
    );

    return res.status(502).json({
      message:
        'Unable to store the product image in Cloudinary.',
      error:
        error.message || 'Unknown Cloudinary error'
    });
  }

  if (
    !uploaded?.secure_url ||
    !uploaded?.public_id
  ) {
    console.error(
      'Cloudinary returned an incomplete upload result:',
      uploaded
    );

    return res.status(502).json({
      message:
        'Cloudinary did not return a valid image URL.'
    });
  }

  if (
    uploaded.secure_url.startsWith(
      'data:image/'
    )
  ) {
    console.error(
      'Rejected Base64 image returned by upload service.'
    );

    return res.status(502).json({
      message:
        'The image service returned Base64 data instead of a Cloudinary URL.'
    });
  }

  const oldPublicId =
    product.imagePublicId || '';

  product.imageUrl =
    uploaded.secure_url;

  product.imagePublicId =
    uploaded.public_id;

  await product.save();

  if (
    oldPublicId &&
    oldPublicId !== uploaded.public_id
  ) {
    try {
      await deleteProductImage(
        oldPublicId
      );
    } catch (cleanupError) {
      console.error(
        'Old product image cleanup failed:',
        cleanupError
      );
    }
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_image_uploaded',
    affectedRecord:
      product._id.toString(),
    metadata: {
      fileName:
        req.file.originalname || '',
      mimeType:
        req.file.mimetype || '',
      sizeBytes:
        req.file.size || 0,
      maxSizeBytes:
        MAX_IMAGE_SIZE_BYTES,
      storage: 'cloudinary',
      publicId:
        uploaded.public_id
    }
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

  return res.json({
    message: 'Product image saved',
    product
  });
}

function normalizeSyncPayload(payload = {}) {
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
    Object.entries(payload).filter(
      ([key]) => allowed.includes(key)
    )
  );

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim();
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
    )
      .trim();

    if (value) {
      updates.qrCode = value;
    } else {
      delete updates.qrCode;
    }
  }

  if (
    updates.reorderLevel !== undefined &&
    (
      !Number.isFinite(
        Number(updates.reorderLevel)
      ) ||
      Number(updates.reorderLevel) < 0
    )
  ) {
    const error = new Error(
      'Reorder level must be a non-negative number.'
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    updates.costPrice !== undefined &&
    (
      !Number.isFinite(
        Number(updates.costPrice)
      ) ||
      Number(updates.costPrice) < 0
    )
  ) {
    const error = new Error(
      'Cost price must be a non-negative number.'
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    updates.sellingPrice !== undefined &&
    (
      !Number.isFinite(
        Number(updates.sellingPrice)
      ) ||
      Number(updates.sellingPrice) < 0
    )
  ) {
    const error = new Error(
      'Selling price must be a non-negative number.'
    );

    error.statusCode = 400;

    throw error;
  }

  return updates;
}

function getDuplicateProductError(error) {
  const duplicateField = Object.keys(
    error.keyPattern || {}
  )[0];

  const message =
    duplicateField === 'sku'
      ? 'This SKU already exists.'
      : duplicateField === 'barcode'
        ? 'This barcode already exists.'
        : 'A product with this information already exists.';

  const result = new Error(message);

  result.statusCode = 409;

  return result;
}

function isFinalSyncError(error) {
  return [
    400,
    403,
    404,
    409,
    422
  ].includes(
    Number(error.statusCode || 0)
  );
}

async function saveSyncReceipt(
  operation,
  {
    status,
    product = null,
    response = null,
    errorMessage = ''
  }
) {
  operation.status = status;

  if (product) {
    operation.product = product._id;
  }

  if (response) {
    operation.response = response;
  }

  operation.errorMessage = errorMessage;

  await operation.save();
}

async function getCompletedSyncResponse(
  operation,
  account
) {
  if (
    operation.account.toString() !==
    account._id.toString()
  ) {
    const error = new Error(
      'This synchronization operation belongs to another account.'
    );

    error.statusCode = 403;

    throw error;
  }

  if (
    operation.status === 'completed' &&
    operation.product
  ) {
    const product = await Product.findById(
      operation.product
    ).populate('category supplier', 'name');

    if (!product) {
      const error = new Error(
        'The saved synchronization receipt refers to a product that no longer exists.'
      );

      error.statusCode = 409;

      throw error;
    }

    return {
      replayed: true,
      operationId: operation.operationId,
      product
    };
  }

  if (
    operation.status === 'retryable' &&
    operation.product
  ) {
    const product = await Product.findById(
      operation.product
    ).populate('category supplier', 'name');

    if (product) {
      return {
        replayed: true,
        operationId: operation.operationId,
        product
      };
    }
  }

  return null;
}

export async function syncProductDraft(
  req,
  res
) {
  const {
    operationId,
    kind,
    productId,
    baseSyncVersion,
    payload
  } = req.body || {};

  const normalizedOperationId = String(
    operationId || ''
  ).trim();

  if (
    normalizedOperationId.length < 8 ||
    normalizedOperationId.length > 200
  ) {
    return res.status(400).json({
      message:
        'A valid synchronization operation ID is required.'
    });
  }

  if (
    !['create', 'update'].includes(kind)
  ) {
    return res.status(400).json({
      message:
        'Synchronization kind must be create or update.'
    });
  }

  if (
    kind === 'update' &&
    !mongoose.isValidObjectId(productId)
  ) {
    return res.status(400).json({
      message:
        'A valid product ID is required for an offline product edit.'
    });
  }

  let existingOperation =
    await SyncOperation.findOne({
      operationId: normalizedOperationId
    });

  if (existingOperation) {
    try {
      const existingResponse =
        await getCompletedSyncResponse(
          existingOperation,
          req.account
        );

      if (existingResponse) {
        return res.json(existingResponse);
      }

      if (
        existingOperation.account.toString() !==
        req.account._id.toString()
      ) {
        return res.status(403).json({
          message:
            'This synchronization operation belongs to another account.'
        });
      }

      if (
        existingOperation.status ===
        'processing'
      ) {
        return res.status(409).json({
          message:
            'This product synchronization is already being processed. Try again shortly.'
        });
      }

      if (
        existingOperation.status ===
        'retryable'
      ) {
        existingOperation.status =
          'processing';

        await existingOperation.save();

        return await processSyncOperation({
          req,
          res,
          operation:
            existingOperation,
          kind,
          productId,
          baseSyncVersion,
          payload
        });
      }

      return res.status(409).json({
        message:
          existingOperation.errorMessage ||
          'This synchronization operation failed previously. Resolve the product issue and create a new draft before retrying.'
      });
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        message:
          error.message ||
          'Unable to read synchronization status.'
      });
    }
  }

  try {
    existingOperation =
      await SyncOperation.create({
        operationId:
          normalizedOperationId,

        account: req.account._id,

        type:
          kind === 'create'
            ? 'product_create'
            : 'product_update',

        status: 'processing'
      });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateOperation =
        await SyncOperation.findOne({
          operationId:
            normalizedOperationId
        });

      if (duplicateOperation) {
        try {
          const duplicateResponse =
            await getCompletedSyncResponse(
              duplicateOperation,
              req.account
            );

          if (duplicateResponse) {
            return res.json(
              duplicateResponse
            );
          }
        } catch (duplicateReadError) {
          return res.status(
            duplicateReadError.statusCode ||
              500
          ).json({
            message:
              duplicateReadError.message ||
              'Unable to read synchronization status.'
          });
        }
      }

      return res.status(409).json({
        message:
          'This product synchronization is already being processed. Try again shortly.'
      });
    }

    throw error;
  }

  return await processSyncOperation({
    req,
    res,
    operation: existingOperation,
    kind,
    productId,
    baseSyncVersion,
    payload
  });
}

async function processSyncOperation({
  req,
  res,
  operation,
  kind,
  productId,
  baseSyncVersion,
  payload
}) {
  try {
    const updates =
      normalizeSyncPayload(payload);

    let product;

    if (kind === 'create') {
      if (!updates.name?.trim()) {
        const error = new Error(
          'Product name is required.'
        );

        error.statusCode = 400;

        throw error;
      }

      const barcode =
        updates.barcode ||
        (await generateInternalBarcode());

      const sku =
        updates.sku ||
        (await generateUniqueSku());

      const productData = {
        ...updates,

        barcode,

        sku,

        qrCode:
          String(updates.qrCode || '')
            .trim() ||
          barcode,

        currentStock: 0,

        createdBy: req.account._id
      };

      try {
        product = await Product.create(
          productData
        );

        /*
         * Save the product reference immediately.
         * If alert creation, auditing, or the response step
         * fails afterward, a retry can safely recover this
         * already-created product instead of recreating it.
         */
        await saveSyncReceipt(
          operation,
          {
            status: 'processing',
            product
          }
        );
      } catch (error) {
        if (error.code === 11000) {
          throw getDuplicateProductError(
            error
          );
        }

        throw error;
      }

      try {
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
      } catch (alertError) {
        console.error(
          'Offline product alert creation failed:',
          alertError
        );
      }

      try {
        await writeAudit({
          req,
          account: req.account,
          action:
            'product_created_offline_sync',
          affectedRecord:
            product._id.toString(),
          metadata: {
            operationId:
              operation.operationId,
            sku: product.sku,
            barcode: product.barcode,
            initialStock: 0,
            stockEntryMethod:
              'batch_receive_required'
          }
        });
      } catch (auditError) {
        console.error(
          'Offline product audit write failed:',
          auditError
        );
      }
    } else {
      const expectedVersion = Number(
        baseSyncVersion || 1
      );

      if (
        !Number.isInteger(expectedVersion) ||
        expectedVersion < 1
      ) {
        const error = new Error(
          'A valid base product version is required for an offline edit.'
        );

        error.statusCode = 400;

        throw error;
      }

      const currentProduct =
        await Product.findById(productId);

      if (
        !currentProduct ||
        currentProduct.isArchived
      ) {
        const error = new Error(
          'Product not found or archived.'
        );

        error.statusCode = 404;

        throw error;
      }

      const currentVersion = Number(
        currentProduct.syncVersion || 1
      );

      if (
        currentVersion !== expectedVersion
      ) {
        const error = new Error(
          'This product was changed on the server after the offline edit was created. Review the latest product before applying the local edit.'
        );

        error.statusCode = 409;
        error.code =
          'PRODUCT_SYNC_CONFLICT';

        throw error;
      }

      try {
        product =
          await Product.findOneAndUpdate(
            {
              _id: productId,
              syncVersion:
                expectedVersion,
              isArchived: false
            },
            {
              ...updates,
              $inc: {
                syncVersion: 1
              }
            },
            {
              new: true,
              runValidators: true
            }
          );
      } catch (error) {
        if (error.code === 11000) {
          throw getDuplicateProductError(
            error
          );
        }

        throw error;
      }

      if (!product) {
        const error = new Error(
          'The product changed before the offline edit could be synchronized. Review the latest server product.'
        );

        error.statusCode = 409;
        error.code =
          'PRODUCT_SYNC_CONFLICT';

        throw error;
      }

      await saveSyncReceipt(
        operation,
        {
          status: 'processing',
          product
        }
      );

      try {
        await writeAudit({
          req,
          account: req.account,
          action:
            'product_updated_offline_sync',
          affectedRecord:
            product._id.toString(),
          metadata: {
            operationId:
              operation.operationId,
            changedFields:
              Object.keys(updates),
            baseSyncVersion:
              expectedVersion,
            syncVersion:
              product.syncVersion
          }
        });
      } catch (auditError) {
        console.error(
          'Offline product audit write failed:',
          auditError
        );
      }
    }

    await saveSyncReceipt(
      operation,
      {
        status: 'completed',
        product,
        response: {
          productId:
            product._id.toString(),
          productUpdatedAt:
            product.updatedAt
        },
        errorMessage: ''
      }
    );

    req.app.get('io')?.emit(
      'productUpdated',
      product
    );

    const populatedProduct =
      await Product.findById(
        product._id
      ).populate(
        'category supplier',
        'name'
      );

    return res.status(
      kind === 'create' ? 201 : 200
    ).json({
      replayed: false,
      operationId:
        operation.operationId,
      product: populatedProduct
    });
  } catch (error) {
    const finalError =
      isFinalSyncError(error);

    try {
      await saveSyncReceipt(
        operation,
        {
          status: finalError
            ? 'failed'
            : 'retryable',
          errorMessage:
            error.message ||
            'Unable to synchronize product draft.'
        }
      );
    } catch (receiptError) {
      console.error(
        'Unable to save failed synchronization receipt:',
        receiptError
      );
    }

    return res.status(
      error.statusCode || 500
    ).json({
      message:
        error.message ||
        'Unable to synchronize product draft.',
      code:
        error.code || undefined,
      retryable: !finalError
    });
  }
}

export async function createProduct(
  req,
  res
) {
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
      String(req.body.qrCode || '')
        .trim() ||
      barcode,

    createdBy: req.account._id
  };

  if (!data.name?.trim()) {
    return res.status(400).json({
      message: 'Product name is required'
    });
  }

  const requestedInitialStock = Number(
    req.body.currentStock || 0
  );

  if (
    !Number.isFinite(
      requestedInitialStock
    ) ||
    requestedInitialStock < 0
  ) {
    return res.status(400).json({
      message:
        'Initial quantity must be a non-negative number.'
    });
  }

  if (requestedInitialStock > 0) {
    return res.status(400).json({
      message:
        'New products must start with zero stock. Register the product first, then use Receive Stock to create the first batch and make it sellable in POS.'
    });
  }

  data.currentStock = 0;

  if (
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
    product = await Product.create(
      data
    );
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      if (
        duplicateField === 'sku'
      ) {
        return res.status(409).json({
          message:
            'This SKU already exists. Please try again.'
        });
      }

      if (
        duplicateField === 'barcode'
      ) {
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

  await writeAudit({
    req,
    account: req.account,
    action: 'product_created',
    affectedRecord:
      product._id.toString(),
    metadata: {
      sku: product.sku,
      barcode: product.barcode,
      initialStock: 0,
      stockEntryMethod:
        'batch_receive_required'
    }
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

  res.status(201).json(product);
}

export async function updateProduct(
  req,
  res
) {
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
    Object.entries(req.body).filter(
      ([key]) => allowed.includes(key)
    )
  );

  if (updates.name !== undefined) {
    updates.name = String(
      updates.name
    ).trim();
  }

  if (
    updates.barcode !== undefined
  ) {
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
    )
      .trim();

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
    product =
      await Product.findByIdAndUpdate(
        req.params.id,
        {
          ...updates,
          $inc: {
            syncVersion: 1
          }
        },
        {
          new: true,
          runValidators: true
        }
      );
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField =
        Object.keys(
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
    affectedRecord:
      product._id.toString(),
    metadata: {
      changedFields:
        Object.keys(updates)
    }
  });

  req.app.get('io')?.emit(
    'productUpdated',
    product
  );

  res.json(product);
}

export async function archiveProduct(
  req,
  res
) {
  const product =
    await Product.findByIdAndUpdate(
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
    affectedRecord:
      product._id.toString()
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

export async function deleteProduct(
  req,
  res
) {
  const product = await Product.findById(
    req.params.id
  );

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  await removeBatchesForProduct(
    product._id
  );

  await ExpirationAlert.deleteMany({
    product: product._id
  });

  if (product.imagePublicId) {
    try {
      await deleteProductImage(
        product.imagePublicId
      );
    } catch (cleanupError) {
      console.error(
        'Product image cleanup failed:',
        cleanupError
      );
    }
  }

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