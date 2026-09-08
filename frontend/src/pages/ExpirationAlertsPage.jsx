import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import AlertFilters from '../components/alerts/AlertFilters';
import useLowStockAlerts from '../hooks/useLowStockAlerts';
import { useAuth } from '../context/AuthContext';

function sortAlerts(rows) {
  const severity = { critical: 0, warning: 1, info: 2 };
  return [...rows].sort((a, b) => {
    const resolved = (a.status === 'resolved' ? 1 : 0) - (b.status === 'resolved' ? 1 : 0);
    if (resolved) return resolved;
    const severityDifference = (severity[a.severity] ?? 3) - (severity[b.severity] ?? 3);
    if (severityDifference) return severityDifference;
    return new Date(a.expirationDate || a.createdAt || 0) - new Date(b.expirationDate || b.createdAt || 0);
  });
}

function filterAlerts(rows, filter) {
  return sortAlerts(filter === 'all' ? rows : rows.filter(alert => alert.status === filter));
}

export default function ExpirationAlertsPage() {
  const { account } = useAuth();
  const { expirationAlerts, loading, error, load, markRead, resolve } = useLowStockAlerts();
  const [filter, setFilter] = useState('all');
  const canResolve = ['admin', 'manager'].includes(account?.role);
  const rows = useMemo(() => filterAlerts(expirationAlerts, filter), [expirationAlerts, filter]);
  const activeCount = expirationAlerts.filter(alert => alert.status !== 'resolved').length;
  const unreadCount = expirationAlerts.filter(alert => alert.status === 'unread').length;
  const resolvedCount = expirationAlerts.filter(alert => alert.status === 'resolved').length;

  async function action(fn) {
    try { await fn(); } catch (err) { window.alert(err.response?.data?.message || 'Unable to update the alert'); }
  }

  return (
    <div className="alerts-page dedicated-alert-page">
      <div className="page-heading">
        <div><p className="eyebrow">INVENTORY NOTIFICATIONS</p><h1>Expiration Alerts</h1><p>Review products approaching or passing their expiration date.</p></div>
        <button type="button" className="secondary-btn" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>
      {error && <div className="form-error page-message">{error}</div>}
      <div className="alert-summary-grid">
        <GlassCard className="alert-summary-card"><div className="alert-summary-icon active-summary"><CalendarClock size={20} /></div><div><span>Active alerts</span><strong>{activeCount}</strong><small>Expiration reviews pending</small></div></GlassCard>
        <GlassCard className="alert-summary-card"><div className="alert-summary-icon unread-summary"><CalendarClock size={20} /></div><div><span>Unread alerts</span><strong>{unreadCount}</strong><small>Need attention</small></div></GlassCard>
        <GlassCard className="alert-summary-card"><div className="alert-summary-icon resolved-summary"><CheckCircle2 size={20} /></div><div><span>Resolved alerts</span><strong>{resolvedCount}</strong><small>Completed reviews</small></div></GlassCard>
      </div>
      <GlassCard className="alerts-container dedicated-alert-container">
        <div className="section-heading"><div><h3><CalendarClock size={18} /> Expiration Alerts</h3><p>Products approaching or passing their expiration date.</p></div><AlertFilters value={filter} onChange={setFilter} /></div>
        {loading ? <div className="page-loading">Loading alerts...</div> : !rows.length ? <EmptyState title={filter === 'all' ? 'No expiration alerts' : `No ${filter} expiration alerts`} description="Products expiring soon will appear here automatically." /> : <div className="alerts-list">{rows.map(alert => <AlertCard key={alert._id} alert={{ ...alert, alertType: 'expiration' }} canResolve={canResolve} onRead={id => action(() => markRead(id, 'expiration'))} onResolve={id => action(() => resolve(id, 'expiration'))} />)}</div>}
      </GlassCard>
    </div>
  );
}