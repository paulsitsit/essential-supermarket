import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import StockMovement from '../models/StockMovement.js';
import SyncOperation from '../models/SyncOperation.js';

import {
  writeAudit
} from '../utils/audit.js';

import {
  createBatchNumber,
  normalizeExpirationDate
} from '../services/batch.service.js';

import {
  syncExpirationAlertForBatch
} from '../services/expirationAlert.service.js';

import {
  createOrUpdateAlert,
  notifyStockAdded
} from '../services/inventory.service.js';

export async function getBatchesByBarcode(
  req,
  res
) {
  const barcode = String(
    req.params.barcode || ''
  )
    .trim()
    .toUpperCase();

  if (!barcode) {
    return res.status(400).json({
      message: 'A barcode is required'
    });
  }

  const product = await Product.findOne({
    barcode,
    isArchived: false
  }).populate('category supplier', 'name');

  if (!product) {
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

export async function getBatchesByProductId(
  req,
  res
) {
  const product = await Product.findById(
    req.params.productId
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

export async function receiveStockBatch(
  req,
  res
) {
  const {
    barcode,
    productId,
    quantity,
    expirationDate,
    batchNumber,
    receivedDate,
    reason = 'Stock received'
  } = req.body;

  let product = null;

  if (productId) {
    product = await Product.findById(
      productId
    );
  } else if (barcode) {
    product = await Product.findOne({
      barcode: String(barcode)
        .trim()
        .toUpperCase()
    });
  }

  if (
    !product ||
    product.isArchived
  ) {
    return res.status(404).json({
      message:
        'Product not found. Create the product before receiving stock.'
    });
  }

  const receivedQuantity = Number(
    quantity
  );

  if (
    !Number.isFinite(receivedQuantity) ||
    receivedQuantity <= 0
  ) {
    return res.status(400).json({
      message:
        'Received quantity must be greater than zero'
    });
  }

  const safeBatchNumber =
    String(batchNumber || '').trim() ||
    createBatchNumber(product);

  const existingBatch =
    await ProductBatch.findOne({
      product: product._id,
      batchNumber: safeBatchNumber
    });

  if (existingBatch) {
    return res.status(409).json({
      message:
        'This batch number already exists for the product'
    });
  }

  const normalizedExpiration =
    normalizeExpirationDate(expirationDate);

  const receivedAt = receivedDate
    ? new Date(receivedDate)
    : new Date();

  if (
    Number.isNaN(
      receivedAt.getTime()
    )
  ) {
    return res.status(400).json({
      message: 'Invalid received date'
    });
  }

  const previousStock = Number(
    product.currentStock || 0
  );

  const batch = await ProductBatch.create({
    product: product._id,
    barcode: product.barcode,
    expirationDate: normalizedExpiration,
    quantity: receivedQuantity,
    receivedDate: receivedAt,
    batchNumber: safeBatchNumber,
    branch: product.branch,
    createdBy: req.account._id
  });

  product.currentStock =
    previousStock + receivedQuantity;

  await product.save();

  const movement =
    await StockMovement.create({
      product: product._id,
      account: req.account._id,
      movementType: 'stock_in',
      quantityChanged: receivedQuantity,
      previousStock,
      newStock: product.currentStock,
      reason,
      branch: product.branch,
      batchAllocations: [
        {
          batch: batch._id,
          batchNumber: batch.batchNumber,
          expirationDate:
            batch.expirationDate,
          quantity: receivedQuantity
        }
      ]
    });

  const io = req.app.get('io');

  await createOrUpdateAlert(
    product,
    req.account,
    req,
    io
  );

  await syncExpirationAlertForBatch(
    batch,
    req.account,
    req,
    io
  );

  try {
    await notifyStockAdded({
      product,
      movement,
      account: req.account,
      io
    });
  } catch (notificationError) {
    console.error(
      'Stock-added notification processing failed after batch receive:',
      notificationError
    );
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'batch_received',
    affectedRecord: batch._id.toString(),
    metadata: {
      productId: product._id.toString(),
      barcode: product.barcode,
      quantity: receivedQuantity,
      batchNumber: batch.batchNumber,
      expirationDate: batch.expirationDate
    }
  });

  io?.emit('stockUpdated', {
    product,
    movement
  });

  io?.emit('productUpdated', product);

  io?.emit('batchUpdated', {
    productId: product._id.toString(),
    batch
  });

  res.status(201).json({
    message: 'Stock batch received',
    product,
    batch,
    movement
  });
}

function isFinalStockSyncError(error) {
  return [
    400,
    403,
    404,
    409,
    422
  ].includes(
    Number(error?.statusCode || 0)
  );
}

function getDuplicateBatchError(error) {
  const duplicateField = Object.keys(
    error.keyPattern || {}
  )[0];

  const message =
    duplicateField === 'batchNumber'
      ? 'This batch number already exists for the product.'
      : 'A duplicate stock receipt was detected.';

  const result = new Error(message);

  result.statusCode = 409;

  return result;
}

function normalizeStockReceivePayload(
  payload = {}
) {
  const productId = String(
    payload.productId || ''
  ).trim();

  const quantity = Number(
    payload.quantity
  );

  const reason = String(
    payload.reason || ''
  ).trim();

  const batchNumber = String(
    payload.batchNumber || ''
  ).trim();

  const receivedDate = String(
    payload.receivedDate || ''
  ).trim();

  const expirationDate = payload.expirationDate
    ? String(payload.expirationDate).trim()
    : null;

  if (!productId) {
    const error = new Error(
      'A product ID is required for a stock receipt.'
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    const error = new Error(
      'Received quantity must be a whole number greater than zero.'
    );

    error.statusCode = 400;

    throw error;
  }

  if (!reason) {
    const error = new Error(
      'A stock receipt reason is required.'
    );

    error.statusCode = 400;

    throw error;
  }

  if (!receivedDate) {
    const error = new Error(
      'Received date is required.'
    );

    error.statusCode = 400;

    throw error;
  }

  const receivedAt = new Date(
    receivedDate
  );

  if (
    Number.isNaN(
      receivedAt.getTime()
    )
  ) {
    const error = new Error(
      'Received date is invalid.'
    );

    error.statusCode = 400;

    throw error;
  }

  return {
    productId,
    quantity,
    reason,
    batchNumber,
    receivedDate,
    expirationDate
  };
}

async function getStockSyncResponse(
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
    operation.status !== 'completed' ||
    !operation.product ||
    !operation.batch ||
    !operation.movement
  ) {
    return null;
  }

  const [
    product,
    batch,
    movement
  ] = await Promise.all([
    Product.findById(operation.product)
      .populate('category supplier', 'name'),

    ProductBatch.findById(operation.batch),

    StockMovement.findById(
      operation.movement
    )
  ]);

  if (!product || !batch || !movement) {
    const error = new Error(
      'The saved stock receipt refers to inventory data that no longer exists.'
    );

    error.statusCode = 409;

    throw error;
  }

  return {
    replayed: true,
    operationId: operation.operationId,
    product,
    batch,
    movement
  };
}

async function saveStockSyncReceipt(
  operation,
  {
    status,
    product = null,
    batch = null,
    movement = null,
    response = null,
    errorMessage = ''
  }
) {
  operation.status = status;

  if (product) {
    operation.product = product._id;
  }

  if (batch) {
    operation.batch = batch._id;
  }

  if (movement) {
    operation.movement = movement._id;
  }

  if (response) {
    operation.response = response;
  }

  operation.errorMessage = errorMessage;

  await operation.save();
}

export async function syncReceiveStockDraft(
  req,
  res
) {
  const {
    operationId,
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

  let operation = await SyncOperation.findOne({
    operationId: normalizedOperationId
  });

  if (operation) {
    try {
      const existingResponse =
        await getStockSyncResponse(
          operation,
          req.account
        );

      if (existingResponse) {
        return res.json(existingResponse);
      }

      if (
        operation.account.toString() !==
        req.account._id.toString()
      ) {
        return res.status(403).json({
          message:
            'This synchronization operation belongs to another account.'
        });
      }

      if (
        operation.status === 'processing'
      ) {
        return res.status(409).json({
          message:
            'This stock receipt is already being processed. Try again shortly.'
        });
      }

      if (
        operation.status === 'failed'
      ) {
        return res.status(409).json({
          message:
            operation.errorMessage ||
            'This stock receipt failed previously. Create a new receipt after correcting the issue.'
        });
      }

      operation.status = 'processing';
      operation.errorMessage = '';

      await operation.save();
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        message:
          error.message ||
          'Unable to read stock synchronization status.'
      });
    }
  } else {
    try {
      operation = await SyncOperation.create({
        operationId: normalizedOperationId,
        account: req.account._id,
        type: 'stock_receive',
        status: 'processing'
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicateOperation =
          await SyncOperation.findOne({
            operationId: normalizedOperationId
          });

        if (duplicateOperation) {
          try {
            const duplicateResponse =
              await getStockSyncResponse(
                duplicateOperation,
                req.account
              );

            if (duplicateResponse) {
              return res.json(
                duplicateResponse
              );
            }
          } catch (readError) {
            return res.status(
              readError.statusCode || 500
            ).json({
              message:
                readError.message ||
                'Unable to read stock synchronization status.'
            });
          }
        }

        return res.status(409).json({
          message:
            'This stock receipt is already being processed. Try again shortly.'
        });
      }

      throw error;
    }
  }

  try {
    const receipt =
      normalizeStockReceivePayload(
        payload
      );

    let product =
      await Product.findById(
        receipt.productId
      );

    if (
      !product ||
      product.isArchived
    ) {
      const error = new Error(
        'Product not found or archived.'
      );

      error.statusCode = 404;

      throw error;
    }

    /*
     * Recovery logic:
     * If the batch was created before a temporary
     * failure, finish the original receipt rather
     * than creating another batch.
     */
    if (operation.batch) {
      const existingBatch =
        await ProductBatch.findById(
          operation.batch
        );

      if (existingBatch) {
        const existingMovement =
          operation.movement
            ? await StockMovement.findById(
                operation.movement
              )
            : null;

        if (existingMovement) {
          await saveStockSyncReceipt(
            operation,
            {
              status: 'completed',
              product,
              batch: existingBatch,
              movement: existingMovement,
              response: {
                productId:
                  product._id.toString(),
                batchId:
                  existingBatch._id.toString(),
                movementId:
                  existingMovement._id.toString()
              },
              errorMessage: ''
            }
          );

          const populatedProduct =
            await Product.findById(
              product._id
            ).populate(
              'category supplier',
              'name'
            );

          return res.json({
            replayed: true,
            operationId:
              operation.operationId,
            product: populatedProduct,
            batch: existingBatch,
            movement: existingMovement
          });
        }
      }
    }

    const safeBatchNumber =
      receipt.batchNumber ||
      createBatchNumber(product);

    const existingBatch =
      await ProductBatch.findOne({
        product: product._id,
        batchNumber: safeBatchNumber
      });

    if (existingBatch) {
      const error = new Error(
        'This batch number already exists for the product.'
      );

      error.statusCode = 409;

      throw error;
    }

    const normalizedExpiration =
      normalizeExpirationDate(
        receipt.expirationDate
      );

    const receivedAt = new Date(
      receipt.receivedDate
    );

    const previousStock = Number(
      product.currentStock || 0
    );

    let batch;

    try {
      batch = await ProductBatch.create({
        product: product._id,
        barcode: product.barcode,
        expirationDate: normalizedExpiration,
        quantity: receipt.quantity,
        receivedDate: receivedAt,
        batchNumber: safeBatchNumber,
        branch: product.branch,
        createdBy: req.account._id
      });
    } catch (error) {
      if (error.code === 11000) {
        throw getDuplicateBatchError(error);
      }

      throw error;
    }

    /*
     * Store the batch reference immediately.
     * This is essential for replay-safe recovery.
     */
    await saveStockSyncReceipt(
      operation,
      {
        status: 'processing',
        product,
        batch,
        response: {
          productId: product._id.toString(),
          batchId: batch._id.toString()
        }
      }
    );

    product.currentStock =
      previousStock + receipt.quantity;

    await product.save();

    const movement =
      await StockMovement.create({
        product: product._id,
        account: req.account._id,
        movementType: 'stock_in',
        quantityChanged: receipt.quantity,
        previousStock,
        newStock: product.currentStock,
        reason: receipt.reason,
        branch: product.branch,
        batchAllocations: [
          {
            batch: batch._id,
            batchNumber: batch.batchNumber,
            expirationDate:
              batch.expirationDate,
            quantity: receipt.quantity
          }
        ],
        referenceType: 'manual',
        referenceId: normalizedOperationId
      });

    await saveStockSyncReceipt(
      operation,
      {
        status: 'processing',
        product,
        batch,
        movement,
        response: {
          productId: product._id.toString(),
          batchId: batch._id.toString(),
          movementId: movement._id.toString()
        }
      }
    );

    const io = req.app.get('io');

    try {
      await createOrUpdateAlert(
        product,
        req.account,
        req,
        io
      );
    } catch (alertError) {
      console.error(
        'Offline stock receipt alert update failed:',
        alertError
      );
    }

    try {
      await syncExpirationAlertForBatch(
        batch,
        req.account,
        req,
        io
      );
    } catch (expirationError) {
      console.error(
        'Offline stock receipt expiration alert update failed:',
        expirationError
      );
    }

    try {
      await notifyStockAdded({
        product,
        movement,
        account: req.account,
        io
      });
    } catch (notificationError) {
      console.error(
        'Offline stock receipt notification failed:',
        notificationError
      );
    }

    try {
      await writeAudit({
        req,
        account: req.account,
        action:
          'batch_received_offline_sync',
        affectedRecord:
          batch._id.toString(),
        metadata: {
          operationId:
            normalizedOperationId,
          productId:
            product._id.toString(),
          barcode: product.barcode,
          quantity: receipt.quantity,
          batchNumber: batch.batchNumber,
          expirationDate:
            batch.expirationDate,
          receivedDate:
            batch.receivedDate
        }
      });
    } catch (auditError) {
      console.error(
        'Offline stock receipt audit write failed:',
        auditError
      );
    }

    await saveStockSyncReceipt(
      operation,
      {
        status: 'completed',
        product,
        batch,
        movement,
        response: {
          productId: product._id.toString(),
          batchId: batch._id.toString(),
          movementId: movement._id.toString()
        },
        errorMessage: ''
      }
    );

    io?.emit('stockUpdated', {
      product,
      movement
    });

    io?.emit('productUpdated', product);

    io?.emit('batchUpdated', {
      productId: product._id.toString(),
      batch
    });

    const populatedProduct =
      await Product.findById(
        product._id
      ).populate(
        'category supplier',
        'name'
      );

    return res.status(201).json({
      replayed: false,
      operationId: normalizedOperationId,
      product: populatedProduct,
      batch,
      movement
    });
  } catch (error) {
    const finalError =
      isFinalStockSyncError(error);

    try {
      await saveStockSyncReceipt(
        operation,
        {
          status: finalError
            ? 'failed'
            : 'retryable',
          errorMessage:
            error.message ||
            'Unable to synchronize stock receipt.'
        }
      );
    } catch (receiptError) {
      console.error(
        'Unable to save failed stock receipt:',
        receiptError
      );
    }

    return res.status(
      error.statusCode || 500
    ).json({
      message:
        error.message ||
        'Unable to synchronize stock receipt.',
      code: error.code || undefined,
      retryable: !finalError
    });
  }
}

export async function updateBatch(
  req,
  res
) {
  const batch = await ProductBatch.findById(
    req.params.id
  );

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const updates = {};

  if (
    req.body.expirationDate !== undefined
  ) {
    updates.expirationDate =
      normalizeExpirationDate(
        req.body.expirationDate
      );
  }

  if (
    req.body.batchNumber !== undefined
  ) {
    const value = String(
      req.body.batchNumber || ''
    ).trim();

    if (!value) {
      return res.status(400).json({
        message:
          'Batch number cannot be empty'
      });
    }

    updates.batchNumber = value;
  }

  if (
    req.body.receivedDate !== undefined
  ) {
    const receivedDate = new Date(
      req.body.receivedDate
    );

    if (
      Number.isNaN(
        receivedDate.getTime()
      )
    ) {
      return res.status(400).json({
        message: 'Invalid received date'
      });
    }

    updates.receivedDate = receivedDate;
  }

  if (updates.batchNumber) {
    const duplicate =
      await ProductBatch.findOne({
        product: batch.product,
        batchNumber: updates.batchNumber,
        _id: {
          $ne: batch._id
        }
      });

    if (duplicate) {
      return res.status(409).json({
        message:
          'This batch number already exists for the product'
      });
    }
  }

  Object.assign(batch, updates);

  await batch.save();

  await syncExpirationAlertForBatch(
    batch,
    req.account,
    req,
    req.app.get('io')
  );

  await writeAudit({
    req,
    account: req.account,
    action: 'batch_updated',
    affectedRecord: batch._id.toString(),
    metadata: {
      changedFields:
        Object.keys(updates)
    }
  });

  req.app.get('io')?.emit(
    'batchUpdated',
    {
      productId:
        batch.product.toString(),
      batch
    }
  );

  res.json(batch);
}

export async function listExpiringSoonBatches(
  req,
  res
) {
  const days = Number(
    req.query.days || 30
  );

  if (
    !Number.isInteger(days) ||
    days <= 0 ||
    days > 365
  ) {
    return res.status(400).json({
      message:
        'days must be a whole number between 1 and 365'
    });
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const until = new Date(today);

  until.setDate(
    until.getDate() + days
  );

  const batches = await ProductBatch.find({
    quantity: {
      $gt: 0
    },

    expirationDate: {
      $ne: null,
      $gte: today,
      $lte: until
    }
  })
    .populate(
      'product',
      'name barcode sku unitType isArchived'
    )
    .sort({
      expirationDate: 1,
      receivedDate: 1
    });

  const activeBatches = batches.filter(
    batch => !batch.product?.isArchived
  );

  res.json({
    days,
    count: activeBatches.length,
    batches: activeBatches
  });
}

export async function traceBatch(
  req,
  res
) {
  const {
    batchNumber
  } = req.params;

  if (
    !batchNumber ||
    !batchNumber.trim()
  ) {
    return res.status(400).json({
      message:
        'Batch number is required'
    });
  }

  const batches = await ProductBatch.find({
    batchNumber: {
      $regex: new RegExp(
        `^${batchNumber.trim()}$`,
        'i'
      )
    }
  })
    .populate(
      'product',
      'name barcode sku'
    )
    .sort({
      createdAt: -1
    })
    .lean();

  if (!batches.length) {
    return res.status(404).json({
      message:
        'No batches found with that number'
    });
  }

  const batchIds = batches.map(
    batch => batch._id
  );

  const {
    default: Sale
  } = await import(
    '../models/Sale.js'
  );

  const sales = await Sale.find({
    'items.batchAllocations.batch': {
      $in: batchIds
    }
  })
    .populate(
      'cashier',
      'fullName role email'
    )
    .populate(
      'items.product',
      'name barcode'
    )
    .sort({
      createdAt: -1
    })
    .lean();

  const saleRows = [];

  for (const sale of sales) {
    for (const item of sale.items || []) {
      const allocations =
        item.batchAllocations || [];

      const relevant = allocations.filter(
        allocation => {
          const batchRef =
            allocation.batch?._id ||
            allocation.batch;

          if (!batchRef) {
            return false;
          }

          const batchIdString =
            batchRef.toString?.();

          return batchIds.some(
            id =>
              id.toString() ===
              batchIdString
          );
        }
      );

      if (!relevant.length) {
        continue;
      }

      for (const allocation of relevant) {
        const batchObject =
          allocation.batch || {};

        const batchIdString =
          (
            batchObject._id ||
            batchObject
          )?.toString?.();

        const matchedBatch =
          batches.find(
            batch =>
              batch._id.toString() ===
              batchIdString
          );

        if (!matchedBatch) {
          continue;
        }

        saleRows.push({
          saleId: sale._id,
          saleDate: sale.createdAt,
          cashier: sale.cashier,
          productName:
            item.product?.name ||
            item.name ||
            'Deleted product',
          productBarcode:
            item.product?.barcode ||
            item.barcode ||
            '',
          quantity:
            allocation.quantity,
          unitPrice:
            item.unitPrice,
          subtotal:
            (allocation.quantity || 0) *
            (item.unitPrice || 0),
          batchNumber:
            matchedBatch.batchNumber,
          batchId: matchedBatch._id
        });
      }
    }
  }

  const movements =
    await StockMovement.find({
      'batchAllocations.batch': {
        $in: batchIds
      }
    })
      .populate(
        'account',
        'fullName role'
      )
      .populate(
        'product',
        'name barcode'
      )
      .sort({
        createdAt: -1
      })
      .lean();

  const movementRows = movements.map(
    movement => {
      const allocations =
        movement.batchAllocations || [];

      const relevant = allocations.filter(
        allocation => {
          const batchRef =
            allocation.batch?._id ||
            allocation.batch;

          if (!batchRef) {
            return false;
          }

          const batchIdString =
            batchRef.toString?.();

          return batchIds.some(
            id =>
              id.toString() ===
              batchIdString
          );
        }
      );

      const quantity = relevant.reduce(
        (total, allocation) =>
          total + (allocation.quantity || 0),
        0
      );

      return {
        movementId: movement._id,
        date: movement.createdAt,
        product:
          movement.product?.name ||
          'Deleted product',
        movementType:
          movement.movementType,
        quantityChanged:
          movement.quantityChanged,
        batchQuantity: quantity,
        reason: movement.reason,
        account:
          movement.account?.fullName ||
          'System'
      };
    }
  );

  res.json({
    batches,
    sales: saleRows,
    movements: movementRows
  });
}

export async function damageBatch(
  req,
  res
) {
  const {
    id
  } = req.params;

  const {
    action,
    quantity,
    reason = 'Damaged stock'
  } = req.body;

  if (
    !action ||
    ![
      'damaged',
      'destroyed'
    ].includes(action)
  ) {
    return res.status(400).json({
      message:
        "Action must be 'damaged' or 'destroyed'"
    });
  }

  const batch = await ProductBatch.findById(
    id
  );

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const quantityValue = Number(
    quantity
  );

  if (
    !Number.isFinite(quantityValue) ||
    quantityValue <= 0
  ) {
    return res.status(400).json({
      message:
        'Quantity must be greater than zero'
    });
  }

  if (
    quantityValue > batch.quantity
  ) {
    return res.status(400).json({
      message:
        'Quantity exceeds current batch quantity'
    });
  }

  const product = await Product.findById(
    batch.product
  );

  if (
    !product ||
    product.isArchived
  ) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const session =
    await ProductBatch.startSession();

  session.startTransaction();

  try {
    const previousBatchQuantity =
      batch.quantity;

    batch.quantity -= quantityValue;

    const previousStock = Number(
      product.currentStock || 0
    );

    const newStock =
      previousStock - quantityValue;

    if (newStock < 0) {
      throw new Error(
        'Stock cannot become negative'
      );
    }

    product.currentStock = newStock;

    await batch.save({ session });
    await product.save({ session });

    const movement =
      await StockMovement.create(
        [
          {
            product: product._id,
            account: req.account._id,
            movementType: action,
            quantityChanged: -quantityValue,
            previousStock,
            newStock,
            reason,
            branch: product.branch,
            batchAllocations: [
              {
                batch: batch._id,
                batchNumber:
                  batch.batchNumber,
                expirationDate:
                  batch.expirationDate,
                quantity: quantityValue
              }
            ]
          }
        ],
        { session }
      );

    await session.commitTransaction();

    const io = req.app.get('io');

    await createOrUpdateAlert(
      product,
      req.account,
      req,
      io
    );

    await syncExpirationAlertForBatch(
      batch,
      req.account,
      req,
      io
    );

    io?.emit('stockUpdated', {
      product,
      movement: movement[0]
    });

    io?.emit(
      'productUpdated',
      product
    );

    io?.emit('batchUpdated', {
      productId: product._id.toString(),
      batch
    });

    await writeAudit({
      req,
      account: req.account,
      action: `batch_${action}`,
      affectedRecord:
        batch._id.toString(),
      metadata: {
        productId:
          product._id.toString(),
        batchNumber: batch.batchNumber,
        quantity: quantityValue,
        previousBatchQuantity,
        newBatchQuantity:
          batch.quantity,
        reason
      }
    });

    res.json({
      message:
        `Batch marked as ${action}`,
      batch,
      product,
      movement: movement[0]
    });
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
}

export async function adjustBatchQuantity(
  req,
  res
) {
  const {
    id
  } = req.params;

  const {
    actualQuantity,
    reason = 'Stock adjustment'
  } = req.body;

  const batch = await ProductBatch.findById(
    id
  );

  if (!batch) {
    return res.status(404).json({
      message: 'Batch not found'
    });
  }

  const actual = Number(
    actualQuantity
  );

  if (
    !Number.isInteger(actual) ||
    actual < 0
  ) {
    return res.status(400).json({
      message:
        'Actual quantity must be a non-negative whole number'
    });
  }

  const product = await Product.findById(
    batch.product
  );

  if (
    !product ||
    product.isArchived
  ) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const currentBatchQuantity =
    batch.quantity;

  const difference =
    actual - currentBatchQuantity;

  if (difference === 0) {
    return res.json({
      message: 'No change required',
      batch,
      product
    });
  }

  const session =
    await ProductBatch.startSession();

  session.startTransaction();

  try {
    const previousStock = Number(
      product.currentStock || 0
    );

    const newStock =
      previousStock + difference;

    if (newStock < 0) {
      throw new Error(
        'Stock cannot become negative'
      );
    }

    batch.quantity = actual;
    product.currentStock = newStock;

    await batch.save({ session });
    await product.save({ session });

    const movement =
      await StockMovement.create(
        [
          {
            product: product._id,
            account: req.account._id,
            movementType:
              'stock_adjustment',
            quantityChanged: difference,
            previousStock,
            newStock,
            reason:
              reason || 'Stock adjustment',
            branch: product.branch,
            batchAllocations: [
              {
                batch: batch._id,
                batchNumber:
                  batch.batchNumber,
                expirationDate:
                  batch.expirationDate,
                quantity: Math.abs(
                  difference
                )
              }
            ]
          }
        ],
        { session }
      );

    await session.commitTransaction();

    const io = req.app.get('io');

    await createOrUpdateAlert(
      product,
      req.account,
      req,
      io
    );

    await syncExpirationAlertForBatch(
      batch,
      req.account,
      req,
      io
    );

    if (difference > 0) {
      try {
        await notifyStockAdded({
          product,
          movement: movement[0],
          account: req.account,
          io
        });
      } catch (notificationError) {
        console.error(
          'Stock-added notification processing failed after batch adjustment:',
          notificationError
        );
      }
    }

    io?.emit('stockUpdated', {
      product,
      movement: movement[0]
    });

    io?.emit(
      'productUpdated',
      product
    );

    io?.emit('batchUpdated', {
      productId: product._id.toString(),
      batch
    });

    await writeAudit({
      req,
      account: req.account,
      action:
        'batch_quantity_adjusted',
      affectedRecord:
        batch._id.toString(),
      metadata: {
        productId:
          product._id.toString(),
        batchNumber: batch.batchNumber,
        previousBatchQuantity:
          currentBatchQuantity,
        newBatchQuantity: actual,
        difference,
        reason
      }
    });

    res.json({
      message:
        'Batch quantity adjusted',
      batch,
      product,
      movement: movement[0]
    });
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
}

export async function listBatches(
  req,
  res
) {
  const batches = await ProductBatch.find({
    quantity: {
      $gt: 0
    }
  })
    .populate(
      'product',
      'name barcode sku'
    )
    .sort({
      expirationDate: 1,
      receivedDate: 1
    })
    .lean();

  res.json(batches);
}