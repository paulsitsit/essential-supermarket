import SaleReturn from '../models/SaleReturn.js';
import QuarantineItem from '../models/QuarantineItem.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';
import StockMovement from '../models/StockMovement.js';
import { createAuditLog } from '../utils/audit.utils.js';

export async function listReturns(req, res) {
  try {
    const { page = 1, limit = 20, saleId } = req.query;
    const query = saleId ? { sale: saleId } : {};
    const returns = await SaleReturn.find(query)
      .populate('sale', 'saleNumber totalAmount createdAt')
      .populate('account', 'fullName email role')
      .populate('processedBy', 'fullName email role')
      .populate('items.product', 'name barcode')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await SaleReturn.countDocuments(query);
    res.json({ returns, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getReturn(req, res) {
  try {
    const ret = await SaleReturn.findById(req.params.id)
      .populate('sale', 'saleNumber items batchAllocations totalAmount createdAt')
      .populate('account', 'fullName email role')
      .populate('processedBy', 'fullName email role')
      .populate('items.product', 'name barcode currentStock')
      .populate('items.quarantineItem')
      .lean();
    if (!ret) return res.status(404).json({ error: 'Return not found' });
    res.json(ret);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createReturn(req, res) {
  try {
    const { saleId, items, reason } = req.body;
    const account = req.account;

    if (!['admin', 'manager'].includes(account.role)) {
      return res.status(403).json({ error: 'Only admin/manager can process returns' });
    }

    const sale = await Sale.findById(saleId).populate('items.product', 'currentStock').lean();
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const returnItems = [];
    const quarantineDocs = [];
    let totalRefund = 0;

    for (const it of items) {
      const saleItem = sale.items[it.saleItemIndex];
      if (!saleItem) return res.status(400).json({ error: 'Invalid sale item index' });
      if (it.quantity > saleItem.quantity) {
        return res.status(400).json({ error: 'Return quantity exceeds sold quantity' });
      }

      const subtotal = it.quantity * saleItem.unitPrice;
      totalRefund += subtotal;

      const batchAllocs = (saleItem.batchAllocations || []).map(ba => ({
        batch: ba.batch,
        batchNumber: ba.batchNumber,
        expirationDate: ba.expirationDate,
        quantity: ba.quantity
      }));

      const returnItem = {
        saleItemIndex: it.saleItemIndex,
        product: saleItem.product,
        name: saleItem.name,
        barcode: saleItem.barcode || '',
        quantity: it.quantity,
        unitPrice: saleItem.unitPrice,
        subtotal,
        condition: it.condition,
        reason: it.reason || '',
        batchAllocations: batchAllocs
      };

      if (it.condition !== 'resellable') {
        const qItem = new QuarantineItem({
          product: saleItem.product,
          name: saleItem.name,
          barcode: saleItem.barcode || '',
          quantity: it.quantity,
          unitCost: saleItem.unitPrice,
          source: 'customer_return',
          condition: it.condition,
          reason: it.reason || 'Customer return non-resellable',
          status: 'pending_inspection',
          branch: sale.branch || 'Main Branch'
        });
        await qItem.save();
        quarantineDocs.push(qItem);
        returnItem.quarantineItem = qItem._id;
      } else {
        // Restock resellable items to original batches
        for (const ba of batchAllocs) {
          await ProductBatch.findByIdAndUpdate(ba.batch, {
            $inc: { quantity: ba.quantity }
          });
        }
        await Product.findByIdAndUpdate(saleItem.product, {
          $inc: { currentStock: it.quantity }
        });

        await StockMovement.create({
          product: saleItem.product,
          account: account._id,
          movementType: 'customer_return',
          quantityChanged: it.quantity,
          previousStock: saleItem.product?.currentStock || 0,
          newStock: (saleItem.product?.currentStock || 0) + it.quantity,
          reason: `Customer return restock: ${saleItem.name}`,
          branch: sale.branch || 'Main Branch',
          batchAllocations: batchAllocs.map(ba => ({
            batch: ba.batch,
            batchNumber: ba.batchNumber,
            expirationDate: ba.expirationDate,
            quantity: ba.quantity
          }))
        });
      }

      returnItems.push(returnItem);
    }

    const retDoc = new SaleReturn({
      sale: saleId,
      account: account._id,
      items: returnItems,
      totalRefund,
      reason,
      processedBy: account._id,
      branch: sale.branch || 'Main Branch'
    });
    await retDoc.save();

    // Link quarantine items back to return
    for (let i = 0; i < quarantineDocs.length; i++) {
      const q = quarantineDocs[i];
      q.sourceReturn = retDoc._id;
      await q.save();
      retDoc.items.find(
        it => it.quarantineItem?.equals?._id || it.quarantineItem?.toString() === q._id.toString()
      ).quarantineItem = q._id;
    }
    await retDoc.save();

    // Update sale returns array and hasReturns flag
    await Sale.findByIdAndUpdate(saleId, {
      $push: { returns: retDoc._id },
      $set: { hasReturns: true }
    });

    await createAuditLog({
      account: account._id,
      action: 'return_created',
      entity: 'SaleReturn',
      entityId: retDoc._id,
      details: { saleId, totalRefund, itemCount: items.length }
    });

    res.status(201).json(retDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}