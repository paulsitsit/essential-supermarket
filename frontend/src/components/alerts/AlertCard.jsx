import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Package,
  ShieldAlert
} from 'lucide-react';

function getAlertType(alert) {
  return (
    alert.alertType ||
    (alert.expirationDate ||
    alert.daysRemaining !== undefined
      ? 'expiration'
      : 'low_stock')
  );
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium'
  }).format(date);
}

function getSeverityLabel(alert) {
  if (alert.severity === 'critical') {
    return 'Critical';
  }

  if (alert.severity === 'warning') {
    return 'Warning';
  }

  return 'Normal';
}

function getStatusLabel(alert, type) {
  if (alert.status === 'resolved') {
    return 'Resolved';
  }

  if (alert.status === 'read') {
    return type === 'low_stock'
      ? 'Low Stock'
      : getSeverityLabel(alert);
  }

  return 'Unread';
}

function getStatusClass(alert) {
  if (alert.status === 'resolved') {
    return 'status-resolved';
  }

  if (alert.status === 'unread') {
    return 'status-unread';
  }

  if (alert.severity === 'critical') {
    return 'status-critical';
  }

  if (alert.severity === 'warning') {
    return 'status-warning';
  }

  return 'status-normal';
}

function getShelfLifeCategory(alert) {
  const categoryName =
    alert.product?.category?.name ||
    alert.product?.categoryName;

  if (categoryName) {
    return `${categoryName} – ${
      alert.severity === 'critical'
        ? 'High Risk'
        : 'Monitor Closely'
    }`;
  }

  if (alert.severity === 'critical') {
    return 'Fresh Meat – High Risk';
  }

  if (alert.severity === 'warning') {
    return 'Perishable – Medium Risk';
  }

  return 'Shelf Stable – Low Risk';
}

function getProductName(alert) {
  return (
    alert.product?.name ||
    alert.productName ||
    'Unknown product'
  );
}

function getProductCode(alert) {
  return (
    alert.product?.barcode ||
    alert.product?.sku ||
    alert.barcode ||
    'Not available'
  );
}

function getSku(alert) {
  return (
    alert.product?.sku ||
    alert.sku ||
    'Not available'
  );
}

function getBatchNumber(alert) {
  return (
    alert.batchNumber ||
    alert.lotNumber ||
    alert.product?.batchNumber ||
    alert.product?.lotNumber ||
    'Not available'
  );
}

function InfoField({ label, value, warning = false }) {
  return (
    <div className={`alert-field ${warning ? 'missing-field' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function AlertCard({
  alert,
  canResolve = false,
  onRead,
  onResolve
}) {
  const type = getAlertType(alert);
  const isExpiration = type === 'expiration';
  const isResolved = alert.status === 'resolved';

  const productName = getProductName(alert);
  const severityLabel = getSeverityLabel(alert);
  const statusLabel = getStatusLabel(
    alert,
    type
  );

  const cardClassName = [
    'alert-card',
    isExpiration
      ? 'expiration-alert-card'
      : 'low-stock-alert-card',
    alert.severity === 'critical'
      ? 'critical-alert'
      : '',
    alert.severity === 'warning'
      ? 'warning-alert'
      : '',
    isResolved ? 'resolved-alert' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const Icon = isExpiration
    ? CalendarClock
    : AlertTriangle;

  return (
    <article className={cardClassName}>
      <div className="alert-card-header">
        <div className="alert-card-icon">
          <Icon size={21} />
        </div>

        <div className="alert-card-heading">
          <div className="alert-card-title-row">
            <div>
              <p className="alert-type-label">
                {isExpiration
                  ? 'EXPIRATION ALERT'
                  : 'LOW STOCK ALERT'}
              </p>

              <h3>{productName}</h3>
            </div>

            <span
              className={`alert-status ${getStatusClass(
                alert
              )}`}
            >
              {statusLabel}
            </span>
          </div>

          <p className="alert-card-subtitle">
            {isExpiration
              ? 'Review expiry information and update inventory records.'
              : 'Product stock is at or below its reorder level.'}
          </p>
        </div>
      </div>

      <div className="alert-card-body">
        {!isExpiration ? (
          <>
            <div className="alert-fields-grid">
              <InfoField
                label="Product name"
                value={productName}
              />

              <InfoField
                label="Current stock"
                value={`${alert.currentStock ?? alert.product?.currentStock ?? 0} ${
                  alert.product?.unitType || 'units'
                }`}
              />

              <InfoField
                label="Reorder level"
                value={`${alert.reorderLevel ?? alert.product?.reorderLevel ?? 0} ${
                  alert.product?.unitType || 'units'
                }`}
              />

              <InfoField
                label="Severity level"
                value={severityLabel}
              />

              <InfoField
                label="Created timestamp"
                value={formatDate(alert.createdAt)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="alert-fields-grid">
              <InfoField
                label="Product name"
                value={productName}
              />

              <InfoField
                label="Code"
                value={getProductCode(alert)}
              />

              <InfoField
                label="SKU"
                value={getSku(alert)}
              />

              <InfoField
                label="Batch / lot number"
                value={getBatchNumber(alert)}
              />

              <InfoField
                label="Expiry date"
                value={formatDateOnly(
                  alert.expirationDate ||
                    alert.product?.expirationDate
                )}
                warning={
                  !alert.expirationDate &&
                  !alert.product?.expirationDate
                }
              />

              <InfoField
                label="Shelf life category"
                value={getShelfLifeCategory(alert)}
              />

              <InfoField
                label="Severity level"
                value={severityLabel}
              />

              <InfoField
                label="Created timestamp"
                value={formatDate(alert.createdAt)}
              />
            </div>

            {!alert.expirationDate &&
              !alert.product?.expirationDate && (
                <div className="missing-alert-data">
                  <Package size={17} />

                  <div>
                    <strong>Expiry date not recorded</strong>

                    <span>
                      Action required: Update expiry date in inventory
                    </span>
                  </div>
                </div>
              )}
          </>
        )}
      </div>

      <div className="alert-card-footer">
        <div className="alert-footer-meta">
          {isExpiration ? (
            <CalendarClock size={14} />
          ) : (
            <ShieldAlert size={14} />
          )}

          <span>
            {isExpiration
              ? alert.daysRemaining !== undefined
                ? `${alert.daysRemaining} days remaining`
                : 'Expiry review required'
              : 'Inventory replenishment review required'}
          </span>
        </div>

        <div className="alert-card-actions">
          {!isResolved && alert.status === 'unread' && (
            <button
              type="button"
              className="alert-action-btn"
              onClick={() => onRead?.(alert._id)}
            >
              <CheckCircle2 size={14} />
              Mark as Read
            </button>
          )}

          {!isResolved && canResolve && (
            <button
              type="button"
              className="alert-action-btn resolve-action"
              onClick={() => onResolve?.(alert._id)}
            >
              <CheckCircle2 size={14} />
              Resolve Alert
            </button>
          )}

          {isResolved && (
            <span className="resolved-label">
              <CheckCircle2 size={14} />
              Resolved
            </span>
          )}
        </div>
      </div>
    </article>
  );
}