import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
import { writeAudit } from '../utils/audit.js';

export async function createOrUpdateAlert(product, account, req, io) {
  if (product.currentStock <= product.reorderLevel) {
    let alert = await LowStockAlert.findOne({
      product: product._id,
      status: { $ne: 'resolved' }
    });

    if (!alert) {
      alert = await LowStockAlert.create({
        product: product._id,
        currentStock: product.currentStock,
        reorderLevel: product.reorderLevel,
        severity: product.currentStock === 0 ? 'critical' : 'warning',
        status: 'unread'
      });

      await writeAudit({
        req,
        account,
        action: 'low_stock_alert_created',
        affectedRecord: product._id.toString(),
        metadata: {
          currentStock: product.currentStock,
          reorderLevel: product.reorderLevel
        }
      });

      io?.emit('lowStockAlertCreated', { product, alert });
    } else {
      alert.currentStock = product.currentStock;
      alert.reorderLevel = product.reorderLevel;
      alert.severity = product.currentStock === 0 ? 'critical' : 'warning';
      await alert.save();
      io?.emit('productUpdated', { product, alert });
    }

    return alert;
  }

  return null;
}

export async function applyMovement({
  productId,
  account,
  movementType,
  quantityChanged,
  reason,
  req,
  io
}) {
  const product = await Product.findById(productId);

  if (!product || product.isArchived) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const change = Number(quantityChanged);

  if (!Number.isFinite(change) || change === 0) {
    throw new Error('quantityChanged must be a non-zero number');
  }

  const previousStock = product.currentStock;
  const newStock = previousStock + change;

  if (newStock < 0) {
    throw new Error('Stock cannot become negative');
  }

  product.currentStock = newStock;
  await product.save();

  const movement = await StockMovement.create({
    product: product._id,
    account: account._id,
    movementType,
    quantityChanged: change,
    previousStock,
    newStock,
    reason,
    branch: product.branch
  });

  await createOrUpdateAlert(product, account, req, io);

  io?.emit('stockUpdated', { product, movement });
  io?.emit('productUpdated', product);

  await writeAudit({
    req,
    account,
    action: movementType,
    affectedRecord: product._id.toString(),
    metadata: {
      previousStock,
      newStock,
      quantityChanged: change
    }
  });

  return { product, movement };
}