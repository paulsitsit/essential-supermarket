import ExpirationAlert from '../models/ExpirationAlert.js';

const DEFAULT_ALERT_WINDOW_DAYS = 30;

function getAlertWindowDays() {
  const value = Number(
    process.env.EXPIRATION_ALERT_DAYS ||
      DEFAULT_ALERT_WINDOW_DAYS
  );

  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_ALERT_WINDOW_DAYS;
}

function startOfDay(value) {
  const date = new Date(value);

  date.setHours(0, 0, 0, 0);

  return date;
}

function getDaysRemaining(expirationDate) {
  const today = startOfDay(new Date());
  const expiration = startOfDay(expirationDate);

  return Math.ceil(
    (expiration.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function getSeverity(daysRemaining) {
  if (daysRemaining <= 3) {
    return 'critical';
  }

  if (daysRemaining <= 7) {
    return 'warning';
  }

  return 'info';
}

async function resolveProductAlerts(
  productId,
  account,
  io,
  reason = 'expiration_alert_resolved'
) {
  const resolvedAt = new Date();

  const result = await ExpirationAlert.updateMany(
    {
      product: productId,
      status: {
        $ne: 'resolved'
      }
    },
    {
      $set: {
        status: 'resolved',
        resolvedAt
      }
    }
  );

  if (result.modifiedCount > 0) {
    io?.emit('expirationAlertResolved', {
      productId: productId.toString(),
      resolvedAt,
      reason
    });
  }

  return result;
}

export async function createOrUpdateExpirationAlert(
  product,
  account,
  req,
  io
) {
  if (!product?._id) {
    return null;
  }

  const productId = product._id;
  const expirationDate = product.expirationDate;

  /*
   * If the product is archived or has no expiration date,
   * any existing active expiration alerts must be resolved.
   */
  if (
    product.isArchived ||
    !expirationDate
  ) {
    await resolveProductAlerts(
      productId,
      account,
      io,
      product.isArchived
        ? 'product_archived'
        : 'expiration_date_removed'
    );

    return null;
  }

  const daysRemaining =
    getDaysRemaining(expirationDate);

  const alertWindowDays =
    getAlertWindowDays();

  /*
   * Expired products and products outside the
   * configured alert window do not need an active alert.
   */
  if (
    daysRemaining < 0 ||
    daysRemaining > alertWindowDays
  ) {
    await resolveProductAlerts(
      productId,
      account,
      io,
      daysRemaining < 0
        ? 'product_expired'
        : 'outside_alert_window'
    );

    return null;
  }

  /*
   * If the expiration date changed, resolve alerts
   * belonging to the old expiration date.
   */
  await ExpirationAlert.updateMany(
    {
      product: productId,
      status: {
        $ne: 'resolved'
      },
      expirationDate: {
        $ne: new Date(expirationDate)
      }
    },
    {
      $set: {
        status: 'resolved',
        resolvedAt: new Date()
      }
    }
  );

  const severity =
    getSeverity(daysRemaining);

  const alert = await ExpirationAlert.findOneAndUpdate(
    {
      product: productId,
      expirationDate: new Date(expirationDate),
      status: {
        $ne: 'resolved'
      }
    },
    {
      $set: {
        severity,
        daysRemaining,
        updatedAt: new Date()
      },
      $setOnInsert: {
        product: productId,
        expirationDate: new Date(expirationDate),
        status: 'unread',
        createdAt: new Date()
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  ).populate(
    'product',
    'name sku barcode expirationDate'
  );

  io?.emit(
    'expirationAlertCreated',
    alert
  );

  return alert;
}

export async function resolveExpirationAlert(
  productId,
  account,
  req,
  io
) {
  return resolveProductAlerts(
    productId,
    account,
    io,
    'manual_product_resolution'
  );
}