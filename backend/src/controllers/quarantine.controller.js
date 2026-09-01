import mongoose from 'mongoose';
import QuarantineItem from '../models/QuarantineItem.js';
import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import StockMovement from '../models/StockMovement.js';
import { writeAudit } from '../utils/audit.js';

function ensureAdminOrManager(account, action) {
  if (!['admin', 'manager'].includes(account?.role)) {
    const error = new Error(`Only admin/manager can ${action}`);
    error.statusCode = 403;
    throw error;
  }
}

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function listQuarantine(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      product
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (product) query.product = product;

    const items = await QuarantineItem.find(query)
      .populate('product', 'name barcode currentStock branch')
      .populate('sourceReturn', 'sale totalRefund createdAt')
      .populate('disposedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await QuarantineItem.countDocuments(query);

    res.json({
      items,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Unable to load quarantine items'
    });
  }
}

export async function disposeItem(req, res) {
  const session = await mongoose.startSession();

  try {
    ensureAdminOrManager(req.account, 'dispose quarantine items');

    const { notes = '' } = req.body;
    let updatedItem = null;

    await session.withTransaction(async () => {
      const item = await QuarantineItem.findById(req.params.id)
        .session(session);

      if (!item) {
        const error = new Error('Quarantine item not found');
        error.statusCode = 404;
        throw error;
      }

      if (item.status !== 'pending_inspection') {
        const error = new Error(
          'This quarantine item was already processed'
        );
        error.statusCode = 400;
        throw error;
      }

      const product = await Product.findById(item.product)
        .session(session)
        .lean();

      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      const previousStock = Number(product.currentStock || 0);

      item.status = 'disposed';
      item.dispositionNotes = String(notes || '').trim();
      item.disposedBy = req.account._id;
      item.disposedAt = new Date();

      await item.save({ session });

      await StockMovement.create(
        [
          {
            product: product._id,
            account: req.account._id,
            movementType: 'quarantine_disposal',
            quantityChanged: 0,
            previousStock,
            newStock: previousStock,
            reason: `Quarantine disposal: ${item.name}`,
            branch: item.branch || product.branch || 'Main Branch',
            batchAllocations: []
          }
        ],
        { session }
      );

      updatedItem = item;
    });

    await writeAudit({
      req,
      account: req.account,
      action: 'quarantine_disposed',
      affectedRecord: updatedItem._id.toString(),
      metadata: {
        productId: updatedItem.product.toString(),
        productName: updatedItem.name,
        quantity: updatedItem.quantity,
        condition: updatedItem.condition,
        reason: updatedItem.reason,
        notes: updatedItem.dispositionNotes
      }
    });

    res.json({
      message: 'Quarantine item disposed successfully',
      item: updatedItem
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'Unable to dispose quarantine item'
    });
  } finally {
    await session.endSession();
  }
}

export async function returnToSupplier(req, res) {
  const session = await mongoose.startSession();

  try {
    ensureAdminOrManager(
      req.account,
      'return quarantine items to the supplier'
    );

    const { notes = '' } = req.body;
    let updatedItem = null;

    await session.withTransaction(async () => {
      const item = await QuarantineItem.findById(req.params.id)
        .session(session);

      if (!item) {
        const error = new Error('Quarantine item not found');
        error.statusCode = 404;
        throw error;
      }

      if (item.status !== 'pending_inspection') {
        const error = new Error(
          'This quarantine item was already processed'
        );
        error.statusCode = 400;
        throw error;
      }

      const product = await Product.findById(item.product)
        .session(session)
        .lean();

      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      const previousStock = Number(product.currentStock || 0);

      item.status = 'returned_to_supplier';
      item.dispositionNotes = String(notes || '').trim();
      item.disposedBy = req.account._id;
      item.disposedAt = new Date();

      await item.save({ session });

      await StockMovement.create(
        [
          {
            product: product._id,
            account: req.account._id,
            movementType: 'return_to_supplier',
            quantityChanged: 0,
            previousStock,
            newStock: previousStock,
            reason: `Quarantine return to supplier: ${item.name}`,
            branch: item.branch || product.branch || 'Main Branch',
            batchAllocations: []
          }
        ],
        { session }
      );

      updatedItem = item;
    });

    await writeAudit({
      req,
      account: req.account,
      action: 'quarantine_returned_to_supplier',
      affectedRecord: updatedItem._id.toString(),
      metadata: {
        productId: updatedItem.product.toString(),
        productName: updatedItem.name,
        quantity: updatedItem.quantity,
        condition: updatedItem.condition,
        notes: updatedItem.dispositionNotes
      }
    });

    res.json({
      message: 'Quarantine item marked as returned to supplier',
      item: updatedItem
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'Unable to return quarantine item to supplier'
    });
  } finally {
    await session.endSession();
  }
}

export async function releaseToStock(req, res) {
  const session = await mongoose.startSession();

  try {
    ensureAdminOrManager(
      req.account,
      'release quarantine items to sellable stock'
    );

    const {
      batchId,
      notes = ''
    } = req.body;

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({
        error: 'Choose a valid product batch before releasing stock'
      });
    }

    let updatedItem = null;
    let updatedBatch = null;
    let updatedProduct = null;

    await session.withTransaction(async () => {
      const item = await QuarantineItem.findById(req.params.id)
        .populate('product', 'name barcode currentStock branch')
        .session(session);

      if (!item) {
        const error = new Error('Quarantine item not found');
        error.statusCode = 404;
        throw error;
      }

      if (item.status !== 'pending_inspection') {
        const error = new Error(
          'This quarantine item was already processed'
        );
        error.statusCode = 400;
        throw error;
      }

      const batch = await ProductBatch.findOne({
        _id: batchId,
        product: item.product._id,
        $or: [
          { expirationDate: null },
          { expirationDate: { $gte: todayStart() } }
        ]
      }).session(session);

      if (!batch) {
        const error = new Error(
          'The selected batch is invalid, expired, or belongs to another product'
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStock = Number(item.product.currentStock || 0);

      updatedBatch = await ProductBatch.findOneAndUpdate(
        {
          _id: batch._id,
          product: item.product._id
        },
        {
          $inc: {
            quantity: item.quantity
          }
        },
        {
          new: true,
          session
        }
      );

      if (!updatedBatch) {
        const error = new Error(
          'Unable to update the selected batch'
        );
        error.statusCode = 500;
        throw error;
      }

      updatedProduct = await Product.findByIdAndUpdate(
        item.product._id,
        {
          $inc: {
            currentStock: item.quantity
          }
        },
        {
          new: true,
          session
        }
      );

      if (!updatedProduct) {
        const error = new Error('Unable to update product stock');
        error.statusCode = 500;
        throw error;
      }

      item.status = 'released_to_stock';
      item.dispositionNotes = String(notes || '').trim();
      item.disposedBy = req.account._id;
      item.disposedAt = new Date();

      await item.save({ session });

      await StockMovement.create(
        [
          {
            product: item.product._id,
            account: req.account._id,
            movementType: 'quarantine_release',
            quantityChanged: item.quantity,
            previousStock,
            newStock: previousStock + item.quantity,
            reason: `Quarantine release to sellable stock: ${item.name}`,
            branch: item.branch || item.product.branch || 'Main Branch',
            batchAllocations: [
              {
                batch: updatedBatch._id,
                batchNumber: updatedBatch.batchNumber || '',
                expirationDate: updatedBatch.expirationDate || null,
                quantity: item.quantity
              }
            ]
          }
        ],
        { session }
      );

      updatedItem = item;
    });

    await writeAudit({
      req,
      account: req.account,
      action: 'quarantine_released_to_stock',
      affectedRecord: updatedItem._id.toString(),
      metadata: {
        productId: updatedItem.product.toString(),
        productName: updatedItem.name,
        quantity: updatedItem.quantity,
        batchId: updatedBatch._id.toString(),
        batchNumber: updatedBatch.batchNumber,
        notes: updatedItem.dispositionNotes
      }
    });

    res.json({
      message: 'Quarantine item released to sellable stock',
      item: updatedItem,
      batch: updatedBatch,
      product: updatedProduct
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'Unable to release quarantine item to stock'
    });
  } finally {
    await session.endSession();
  }
}