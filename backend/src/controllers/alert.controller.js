import LowStockAlert from '../models/LowStockAlert.js';
import ExpirationAlert from '../models/ExpirationAlert.js';
import { writeAudit } from '../utils/audit.js';

const productFields = [
  'name',
  'barcode',
  'sku',
  'currentStock',
  'reorderLevel',
  'status',
  'expirationDate',
  'isArchived'
].join(' ');

/**
 * Return low-stock alerts that still apply to the current inventory.
 *
 * Active alerts are visible only when their product exists, is not archived,
 * and its current stock is at or below its reorder level. Resolved alerts are
 * kept visible for history, even if the related product is no longer present.
 * This filters the response; it does not delete or change old records.
 */
export async function listLowStockAlerts(req, res) {
  const filter = req.query.status
    ? { status: req.query.status }
    : {};

  const alerts = await LowStockAlert.find(filter)
    .populate('product', productFields)
    .populate('resolvedBy', 'fullName')
    .sort({
      status: 1,
      severity: -1,
      createdAt: -1
    });

  const visibleAlerts = alerts.filter(alert => {
    // Resolved alerts are retained as history.
    if (alert.status === 'resolved') {
      return true;
    }

    const product = alert.product;

    // Hide active alerts whose product was deleted or archived.
    if (!product || product.isArchived) {
      return false;
    }

    const currentStock = Number(
      product.currentStock ?? alert.currentStock ?? 0
    );
    const reorderLevel = Number(
      product.reorderLevel ?? alert.reorderLevel ?? 0
    );

    // If stock has recovered, the active alert is stale.
    if (currentStock > reorderLevel) {
      return false;
    }

    // Return the current stock data rather than stale snapshot values.
    alert.currentStock = currentStock;
    alert.reorderLevel = reorderLevel;
    alert.severity = currentStock <= 0 ? 'critical' : 'warning';

    return true;
  });

  res.json(visibleAlerts);
}

export async function markLowStockRead(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(
    req.params.id,
    {
      status: 'read'
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('product', productFields);

  if (!alert) {
    return res.status(404).json({
      message: 'Low-stock alert not found'
    });
  }

  req.app.get('io')?.emit(
    'lowStockAlertUpdated',
    alert
  );

  res.json(alert);
}

export async function resolveLowStock(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(
    req.params.id,
    {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: req.account._id
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('product', productFields)
    .populate('resolvedBy', 'fullName');

  if (!alert) {
    return res.status(404).json({
      message: 'Low-stock alert not found'
    });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'low_stock_alert_resolved',
    affectedRecord: alert._id.toString()
  });

  req.app.get('io')?.emit(
    'lowStockAlertResolved',
    alert
  );

  res.json(alert);
}

export async function listExpirationAlerts(req, res) {
  const filter = req.query.status
    ? { status: req.query.status }
    : {};

  const alerts = await ExpirationAlert.find(filter)
    .populate('product', productFields)
    .populate('resolvedBy', 'fullName')
    .sort({
      status: 1,
      severity: -1,
      expirationDate: 1,
      createdAt: -1
    });

  res.json(alerts);
}

export async function markExpirationRead(req, res) {
  const alert = await ExpirationAlert.findByIdAndUpdate(
    req.params.id,
    {
      status: 'read'
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('product', productFields)
    .populate('resolvedBy', 'fullName');

  if (!alert) {
    return res.status(404).json({
      message: 'Expiration alert not found'
    });
  }

  req.app.get('io')?.emit(
    'expirationAlertRead',
    alert
  );

  res.json(alert);
}

export async function resolveExpiration(req, res) {
  const alert = await ExpirationAlert.findByIdAndUpdate(
    req.params.id,
    {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: req.account._id
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('product', productFields)
    .populate('resolvedBy', 'fullName');

  if (!alert) {
    return res.status(404).json({
      message: 'Expiration alert not found'
    });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'expiration_alert_resolved',
    affectedRecord: alert._id.toString()
  });

  req.app.get('io')?.emit(
    'expirationAlertResolved',
    alert
  );

  res.json(alert);
}
