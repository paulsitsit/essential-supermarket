import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import AlertFilters from '../components/alerts/AlertFilters';
import useLowStockAlerts from '../hooks/useLowStockAlerts';
import { useAuth } from '../context/AuthContext';

function sortAlerts(rows) {
  return [...rows].sort((a, b) => {
    const statusRank = {
      unread: 0,
      read: 1,
      resolved: 2
    };

    const statusDifference =
      (statusRank[a.status] ?? 3) -
      (statusRank[b.status] ?? 3);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const severityRank = {
      critical: 0,
      warning: 1,
      info: 2
    };

    const severityDifference =
      (severityRank[a.severity] ?? 3) -
      (severityRank[b.severity] ?? 3);

    if (severityDifference !== 0) {
      return severityDifference;
    }

    return (
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
    );
  });
}

function filterAlerts(rows, filter) {
  if (filter === 'all') {
    return sortAlerts(rows);
  }

  return sortAlerts(
    rows.filter(alert => alert.status === filter)
  );
}

export default function AlertsPage() {
  const { account } = useAuth();

  const {
    lowStockAlerts = [],
    expirationAlerts = [],
    loading,
    error,
    activeCount,
    unreadCount,
    load,
    markRead,
    resolve
  } = useLowStockAlerts();

  const [lowStockFilter, setLowStockFilter] = useState('all');
  const [expirationFilter, setExpirationFilter] = useState('all');

  const filteredLowStock = useMemo(
    () =>
      filterAlerts(
        lowStockAlerts,
        lowStockFilter
      ),
    [lowStockAlerts, lowStockFilter]
  );

  const filteredExpiration = useMemo(
    () =>
      filterAlerts(
        expirationAlerts,
        expirationFilter
      ),
    [expirationAlerts, expirationFilter]
  );

  const resolvedCount = [
    ...lowStockAlerts,
    ...expirationAlerts
  ].filter(
    alert => alert.status === 'resolved'
  ).length;

  const canResolve = [
    'admin',
    'manager'
  ].includes(account?.role);

  async function safeAction(action) {
    try {
      await action();
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
          'Unable to update the alert'
      );
    }
  }

  function renderAlerts(
    rows,
    type,
    emptyTitle,
    emptyDescription
  ) {
    if (loading) {
      return (
        <div className="page-loading">
          Loading alerts...
        </div>
      );
    }

    if (!rows.length) {
      return (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      );
    }

    return (
      <div className="alerts-list">
        {rows.map(alert => (
          <AlertCard
            key={alert._id}
            alert={{
              ...alert,
              alertType: type
            }}
            canResolve={canResolve}
            onRead={id =>
              safeAction(() =>
                markRead(id, type)
              )
            }
            onResolve={id =>
              safeAction(() =>
                resolve(id, type)
              )
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            INVENTORY NOTIFICATIONS
          </p>

          <h1>
            Low Stock & Expiration Alerts
          </h1>

          <p>
            Review inventory risks and take action quickly.
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

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <div className="alert-summary-grid">
        <GlassCard className="alert-summary-card">
          <div className="alert-summary-icon active-summary">
            <ShieldAlert size={20} />
          </div>

          <div>
            <span>Active alerts</span>
            <strong>{activeCount}</strong>
            <small>Require review</small>
          </div>
        </GlassCard>

        <GlassCard className="alert-summary-card">
          <div className="alert-summary-icon unread-summary">
            <AlertTriangle size={20} />
          </div>

          <div>
            <span>Unread alerts</span>
            <strong>{unreadCount}</strong>
            <small>Need attention</small>
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

      <div className="alerts-stack">
        <GlassCard className="alerts-container">
          <div className="section-heading">
            <div>
              <h3>
                <ShieldAlert size={18} />
                Low Stock Alerts
              </h3>

              <p>
                Products at or below their reorder level.
              </p>
            </div>

            <AlertFilters
              value={lowStockFilter}
              onChange={setLowStockFilter}
            />
          </div>

          {renderAlerts(
            filteredLowStock,
            'low_stock',
            'No low-stock alerts',
            'Products requiring replenishment will appear here.'
          )}
        </GlassCard>

        <GlassCard className="alerts-container">
          <div className="section-heading">
            <div>
              <h3>
                <CalendarClock size={18} />
                Expiration Alerts
              </h3>

              <p>
                Products with upcoming or incomplete expiry information.
              </p>
            </div>

            <AlertFilters
              value={expirationFilter}
              onChange={setExpirationFilter}
            />
          </div>

          {renderAlerts(
            filteredExpiration,
            'expiration',
            'No expiration alerts',
            'Products requiring expiry-date review will appear here.'
          )}
        </GlassCard>
      </div>
    </div>
  );
}