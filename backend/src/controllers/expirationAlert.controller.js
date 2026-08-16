import ExpirationAlert from '../models/ExpirationAlert.js';
import { writeAudit } from '../utils/audit.js';

const productFields = [
  'name',
  'barcode',
  'sku',
  'currentStock',
  'reorderLevel',
  'status'
].join(' ');

const batchFields = [
  'batchNumber',
  'expirationDate',
  'quantity',
  'receivedDate'
].join(' ');

export async function listExpirationAlerts(req, res) {
  const filter = req.query.status
    ? {
        status: req.query.status
      }
    : {};

  const alerts = await ExpirationAlert.find(filter)
    .populate('product', productFields)
    .populate('batch', batchFields)
    .populate('resolvedBy', 'fullName')
    .sort({
      status: 1,
      expirationDate: 1,
      severity: -1,
      createdAt: -1
    });

  res.json(alerts);
}

export async function markExpirationRead(req, res) {
  const alert =
    await ExpirationAlert.findByIdAndUpdate(
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
      .populate('batch', batchFields);

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
  const alert =
    await ExpirationAlert.findByIdAndUpdate(
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
      .populate('batch', batchFields);

  if (!alert) {
    return res.status(404).json({
      message: 'Expiration alert not found'
    });
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'expiration_alert_resolved',
    affectedRecord: alert._id.toString(),
    metadata: {
      batchId: alert.batch?.toString() || null,
      batchNumber: alert.batchNumber || ''
    }
  });

  req.app.get('io')?.emit(
    'expirationAlertResolved',
    alert
  );

  res.json(alert);
}