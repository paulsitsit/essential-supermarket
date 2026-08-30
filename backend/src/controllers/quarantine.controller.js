import QuarantineItem from '../models/QuarantineItem.js';
import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import StockMovement from '../models/StockMovement.js';
import { createAuditLog } from '../utils/audit.utils.js';

export async function listQuarantine(req, res) {
  try {
    const { page = 1, limit = 20, status, product } = req.query;
    const query = {};
    if (status) query.status = status;
    if (product) query.product = product;

    const items = await QuarantineItem.find(query)
      .populate('product', 'name barcode currentStock')
      .populate('sourceReturn', 'sale totalRefund')
      .populate('disposedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await QuarantineItem.countDocuments(query);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function disposeItem(req, res) {
  try {
    const account = req.account;
    if (!['admin', 'manager'].includes(account.role)) {
      return res.status(403).json({ error: 'Only admin/manager can dispose items' });
    }

    const { notes } = req.body;
    const qItem = await QuarantineItem.findById(req.params.id);
    if (!qItem) return res.status(404).json({ error: 'Quarantine item not found' });

    qItem.status = 'disposed';
    qItem.dispositionNotes = notes || '';
    qItem.disposedBy = account._id;
    qItem.disposedAt = new Date();
    await qItem.save();

    await createAuditLog({
      account: account._id,
      action: 'quarantine_disposed',
      entity: 'QuarantineItem',
      entityId: qItem._id,
      details: { productId: qItem.product, quantity: qItem.quantity, reason: qItem.reason }
    });

    res.json(qItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function returnToSupplier(req, res) {
  try {
    const account = req.account;
    if (!['admin', 'manager'].includes(account.role)) {
      return res.status(403).json({ error: 'Only admin/manager can return to supplier' });
    }

    const { notes } = req.body;
    const qItem = await QuarantineItem.findById(req.params.id);
    if (!qItem) return res.status(404).json({ error: 'Quarantine item not found' });

    qItem.status = 'returned_to_supplier';
    qItem.dispositionNotes = notes || '';
    qItem.disposedBy = account._id;
    qItem.disposedAt = new Date();
    await qItem.save();

    await createAuditLog({
      account: account._id,
      action: 'quarantine_returned_to_supplier',
      entity: 'QuarantineItem',
      entityId: qItem._id,
      details: { productId: qItem.product, quantity: qItem.quantity }
    });

    res.json(qItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function releaseToStock(req, res) {
  try {
    const account = req.account;
    if (!['admin', 'manager'].includes(account.role)) {
      return res.status(403).json({ error: 'Only admin/manager can release to stock' });
    }

    const { notes, batchId } = req.body;
    const qItem = await QuarantineItem.findById(req.params.id).populate('product');
    if (!qItem) return res.status(404).json({ error: 'Quarantine item not found' });
    if (qItem.status !== 'pending_inspection') {
      return res.status(400).json({ error: 'Item already processed' });
    }

    qItem.status = 'released_to_stock';
    qItem.dispositionNotes = notes || '';
    qItem.disposedBy = account._id;
    qItem.disposedAt = new Date();
    await qItem.save();

    const batch = await ProductBatch.findById(batchId);
    if (!batch || batch.product.toString() !== qItem.product._id.toString()) {
      return res.status(400).json({ error: 'Invalid batch for this product' });
    }

    await ProductBatch.findByIdAndUpdate(batchId, { $inc: { quantity: qItem.quantity } });
    await Product.findByIdAndUpdate(qItem.product._id, { $inc: { currentStock: qItem.quantity } });

    await StockMovement.create({
      product: qItem.product._id,
      account: account._id,
      movementType: 'quarantine_release',
      quantityChanged: qItem.quantity,
      previousStock: qItem.product.currentStock,
      newStock: qItem.product.currentStock + qItem.quantity,
      reason: `Quarantine release: ${qItem.name}`,
      branch: qItem.branch || 'Main Branch',
      batchAllocations: [
        {
          batch: batchId,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate,
          quantity: qItem.quantity
        }
      ]
    });

    await createAuditLog({
      account: account._id,
      action: 'quarantine_released_to_stock',
      entity: 'QuarantineItem',
      entityId: qItem._id,
      details: { productId: qItem.product._id, quantity: qItem.quantity, batchId }
    });

    res.json(qItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}