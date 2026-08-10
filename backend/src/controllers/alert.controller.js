import LowStockAlert from '../models/LowStockAlert.js';
import Product from '../models/Product.js';
import { writeAudit } from '../utils/audit.js';

export async function listAlerts(req, res) {
  const filter = req.query.status
    ? { status: req.query.status }
    : {};

  const lowStockAlerts = await LowStockAlert.find(filter)
    .populate(
      'product',
      'name barcode sku currentStock reorderLevel status expirationDate'
    )
    .populate('resolvedBy', 'fullName')
    .sort({
      severity: -1,
      createdAt: -1
    })
    .lean();

  const now = new Date();

  const fourteenDaysFromNow = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000
  );

  const expiringProducts = await Product.find({
    expirationDate: {
      $gte: now,
      $lte: fourteenDaysFromNow
    },
    isArchived: false
  })
    .select(
      'name barcode sku currentStock reorderLevel status expirationDate'
    )
    .sort({ expirationDate: 1 })
    .lean();

  const expirationAlerts = expiringProducts.map(product => {
    const expirationDate = new Date(product.expirationDate);

    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const message =
      daysUntilExpiration <= 0
        ? 'Product expires today'
        : `Product expires in ${daysUntilExpiration} day${
            daysUntilExpiration === 1 ? '' : 's'
          }`;

    return {
      _id: `expiration-${product._id}`,
      id: `expiration-${product._id}`,
      type: 'expiration',
      status: 'unread',
      severity: 'high',
      message,
      daysUntilExpiration,
      expirationDate: product.expirationDate,
      product
    };
  });

  const allAlerts = [
    ...expirationAlerts,
    ...lowStockAlerts
  ];

  res.json(allAlerts);
}

export async function markRead(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(
    req.params.id,
    { status: 'read' },
    { new: true }
  ).populate(
    'product',
    'name barcode sku'
  );

  if (!alert) {
    return res.status(404).json({
      message: 'Alert not found'
    });
  }

  req.app.get('io')?.emit(
    'notificationCreated',
    alert
  );

  res.json(alert);
}

export async function resolve(req, res) {
  const alert = await LowStockAlert.findByIdAndUpdate(
    req.params.id,
    {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: req.account._id
    },
    { new: true }
  ).populate(
    'product',
    'name barcode sku'
  );

  if (!alert) {
    return res.status(404).json({
      message: 'Alert not found'
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