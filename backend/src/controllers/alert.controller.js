import LowStockAlert from '../models/LowStockAlert.js';
import { writeAudit } from '../utils/audit.js';

export async function listAlerts(req, res) {
  const filter = req.query.status ? { status: req.query.status } : {};
  const alerts = await LowStockAlert.find(filter).populate('product', 'name barcode sku currentStock reorderLevel status').populate('resolvedBy', 'fullName').sort({ severity: -1, createdAt: -1 });
  res.json(alerts);
}

export async function markRead(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true }).populate('product', 'name barcode sku');
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  req.app.get('io')?.emit('notificationCreated', alert);
  res.json(alert);
}

export async function resolve(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(req.params.id, { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.account._id }, { new: true }).populate('product', 'name barcode sku');
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  await writeAudit({ req, account: req.account, action: 'low_stock_alert_resolved', affectedRecord: alert._id.toString() });
  req.app.get('io')?.emit('lowStockAlertResolved', alert);
  res.json(alert);
}