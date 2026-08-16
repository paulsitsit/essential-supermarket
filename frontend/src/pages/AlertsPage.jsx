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
    const resolvedOrder =
      (a.status === 'resolved' ? 1 : 0) -
      (b.status === 'resolved' ? 1 : 0);

    if (resolvedOrder !== 0) {
      return resolvedOrder;
    }

    const severityOrder = {
      critical: 0,
      warning: 1,
      info: 2
    };

    const severityDifference =
      (severityOrder[a.severity] ?? 3) -
      (severityOrder[b.severity] ?? 3);

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
    lowStockAlerts,
    expirationAlerts,
    loading,
    error,
    activeCount,
    unreadCount,
    load,
    markRead,
    resolve
  } = useLowStockAlerts();

  const [
    lowStockFilter,
    setLowStockFilter
  ] = useState('all');

  const [
    expirationFilter,
    setExpirationFilter
  ] = useState('all');

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

  const canResolve = [
    'admin',
    'manager'
  ].includes(account?.role);

  function renderAlertList(rows, emptyTitle, emptyDescription) {
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
            alert={alert}
            canResolve={canResolve}
            onRead={id =>
              safeAction(() =>
                markRead(
                  id,
                  alert.alertType ||
                    (alert.expirationDate
                      ? 'expiration'
                      : 'low_stock')
                )
              )
            }
            onResolve={id =>
              safeAction(() =>
                resolve(
                  id,
                  alert.alertType ||
                    (alert.expirationDate
                      ? 'expiration'
                      : 'low_stock')
                )
              )
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            INVENTORY NOTIFICATIONS
          </p>

          <h1>Alert Center</h1>

          <p>
            Review low-stock and expiration alerts
            separately.
          </p>
        </div>

        <button
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
            <small>Low-stock and expiration alerts</small>
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
            <strong>
              {
                [...lowStockAlerts, ...expirationAlerts]
                  .filter(
                    alert =>
                      alert.status === 'resolved'
                  ).length
              }
            </strong>
            <small>Completed reviews</small>
          </div>
        </GlassCard>
      </div>

      {/* Two-column layout for Low-Stock and Expiration alerts */}
      <div className="alerts-side-by-side">
        <GlassCard className="alerts-container">
          <div className="section-heading">
            <div>
              <h3>
                <ShieldAlert size={18} />
                Low-Stock Alerts
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

          {renderAlertList(
            filteredLowStock,
            lowStockFilter === 'all'
              ? 'No low-stock alerts'
              : `No ${lowStockFilter} low-stock alerts`,
            'Products reaching their reorder level will appear here automatically.'
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
                Products approaching or passing their
                expiration date.
              </p>
            </div>

            <AlertFilters
              value={expirationFilter}
              onChange={setExpirationFilter}
            />
          </div>

          {renderAlertList(
            filteredExpiration,
            expirationFilter === 'all'
              ? 'No expiration alerts'
              : `No ${expirationFilter} expiration alerts`,
            'Products expiring soon will appear here automatically.'
          )}
        </GlassCard>
      </div>
    </div>
  );
}