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
  'expirationDate'
].join(' ');

export async function listLowStockAlerts(req, res) {
  const filter = req.query.status
    ? { status: req.query.status }
    : {};

  const alerts = await LowStockAlert.find(filter)
    .populate('product', productFields)
    .populate('resolvedBy', 'fullName')
    .sort({
      severity: -1,
      createdAt: -1
    });

  res.json(alerts);
}

export async function markLowStockRead(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(
    req.params.id,
    {
      status: 'read'
    },
    {
      new: true
    }
  ).populate('product', productFields);

  if (!alert) {
    return res.status(404).json({
      message: 'Low-stock alert not found'
    });
  }

  req.app.get('io')?.emit(
    'notificationCreated',
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
      new: true
    }
  ).populate('product', productFields);

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
      new: true
    }
  ).populate('product', productFields);

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
      new: true
    }
  ).populate('product', productFields);

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