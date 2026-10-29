import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import AlertFilters from '../components/alerts/AlertFilters';
import useLowStockAlerts from '../hooks/useLowStockAlerts';
import { useAuth } from '../context/AuthContext';

function getStockInfo(alert) {
  const product =
    alert?.product && typeof alert.product === 'object'
      ? alert.product
      : null;

  // Prefer live product data over the stock snapshot saved on the alert.
  const currentStock = Number(
    product?.currentStock ?? alert?.currentStock ?? 0
  );

  const reorderLevel = Number(
    product?.reorderLevel ?? alert?.reorderLevel ?? 0
  );

  return {
    product,
    currentStock,
    reorderLevel
  };
}

function isCurrentAlert(alert) {
  // Keep resolved records available as history.
  if (alert.status === 'resolved') {
    return true;
  }

  const { product, currentStock, reorderLevel } =
    getStockInfo(alert);

  // Active alerts without a valid product should not be shown as current.
  if (!product || product.isArchived) {
    return false;
  }

  // An active alert is current only while stock is at/below the reorder level.
  return currentStock <= reorderLevel;
}

function sortAlerts(rows) {
  const severity = { critical: 0, warning: 1, info: 2 };

  return [...rows].sort((a, b) => {
    const resolved =
      (a.status === 'resolved' ? 1 : 0) -
      (b.status === 'resolved' ? 1 : 0);

    if (resolved) return resolved;

    const severityDifference =
      (severity[a.severity] ?? 3) -
      (severity[b.severity] ?? 3);

    if (severityDifference) return severityDifference;

    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function filterAlerts(rows, filter) {
  return sortAlerts(
    filter === 'all'
      ? rows
      : rows.filter(alert => alert.status === filter)
  );
}

export default function LowStockAlertsPage() {
  const { account } = useAuth();
  const {
    lowStockAlerts,
    loading,
    error,
    load,
    markRead,
    resolve
  } = useLowStockAlerts();

  const [filter, setFilter] = useState('all');
  const canResolve = ['admin', 'manager'].includes(account?.role);

  // Separate current low-stock and out-of-stock alerts.
  // Resolved records remain visible in the status-filtered history.
  const visibleAlerts = useMemo(
    () => lowStockAlerts.filter(isCurrentAlert),
    [lowStockAlerts]
  );

  const activeAlerts = useMemo(
    () => visibleAlerts.filter(alert => alert.status !== 'resolved'),
    [visibleAlerts]
  );

  const lowStockCount = activeAlerts.filter(alert => {
    const { currentStock, reorderLevel } = getStockInfo(alert);
    return currentStock > 0 && currentStock <= reorderLevel;
  }).length;

  const outOfStockCount = activeAlerts.filter(alert => {
    const { currentStock } = getStockInfo(alert);
    return currentStock <= 0;
  }).length;

  const unreadCount = activeAlerts.filter(
    alert => alert.status === 'unread'
  ).length;

  const resolvedCount = visibleAlerts.filter(
    alert => alert.status === 'resolved'
  ).length;

  const rows = useMemo(
    () => filterAlerts(visibleAlerts, filter),
    [visibleAlerts, filter]
  );

  async function action(fn) {
    try {
      await fn();
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
          'Unable to update the alert'
      );
    }
  }

  return (
    <div className="alerts-page dedicated-alert-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY NOTIFICATIONS</p>
          <h1>Low-Stock Alerts</h1>
          <p>
            Low-stock products and out-of-stock products are counted separately.
          </p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={load}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <div
        className="alert-summary-grid"
        style={{
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 225px), 1fr))'
        }}
      >
        <GlassCard className="alert-summary-card">
          <div className="alert-summary-icon active-summary">
            <Package size={20} />
          </div>
          <div>
            <span>Low-stock alerts</span>
            <strong>{lowStockCount}</strong>
            <small>Stock above zero, at or below reorder level</small>
          </div>
        </GlassCard>

        <GlassCard className="alert-summary-card">
          <div className="alert-summary-icon unread-summary">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>Out-of-stock alerts</span>
            <strong>{outOfStockCount}</strong>
            <small>Zero units available</small>
          </div>
        </GlassCard>

        <GlassCard className="alert-summary-card">
          <div className="alert-summary-icon unread-summary">
            <ShieldAlert size={20} />
          </div>
          <div>
            <span>Unread alerts</span>
            <strong>{unreadCount}</strong>
            <small>Current alerts needing attention</small>
          </div>
        </GlassCard>

        <GlassCard className="alert-summary-card">
          <div className="alert-summary-icon resolved-summary">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Resolved alerts</span>
            <strong>{resolvedCount}</strong>
            <small>Completed reviews</small>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="alerts-container dedicated-alert-container">
        <div className="section-heading">
          <div>
            <h3>
              <ShieldAlert size={18} />
              Inventory Stock Alerts
            </h3>
            <p>
              This list includes both low-stock and out-of-stock products.
              Check the alert label on each row to distinguish them.
            </p>
          </div>

          <AlertFilters value={filter} onChange={setFilter} />
        </div>

        {loading ? (
          <div className="page-loading">Loading alerts...</div>
        ) : !rows.length ? (
          <EmptyState
            title={
              filter === 'all'
                ? 'No current stock alerts'
                : `No ${filter} stock alerts`
            }
            description="Products at or below their reorder level will appear here."
          />
        ) : (
          <div className="alerts-list">
            {rows.map(alert => (
              <AlertCard
                key={alert._id}
                alert={{ ...alert, alertType: 'low_stock' }}
                canResolve={canResolve}
                onRead={id => action(() => markRead(id, 'low_stock'))}
                onResolve={id => action(() => resolve(id, 'low_stock'))}
              />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
