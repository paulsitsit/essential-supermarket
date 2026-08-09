import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import AlertCard from '../components/alerts/AlertCard';
import AlertFilters from '../components/alerts/AlertFilters';
import useLowStockAlerts from '../hooks/useLowStockAlerts';
import { useAuth } from '../context/AuthContext';

export default function AlertsPage() {
  const { account } = useAuth();
  const { alerts, loading, error, activeCount, unreadCount, load, markRead, resolve } = useLowStockAlerts();
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => {
    const rows = filter === 'all' ? alerts : alerts.filter(alert => alert.status === filter);
    return [...rows].sort((a, b) => (a.status === 'resolved' ? 1 : -1) - (b.status === 'resolved' ? 1 : -1) || (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1) || new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, filter]);
  async function safeAction(action) { try { await action(); } catch (err) { window.alert(err.response?.data?.message || 'Unable to update the alert'); } }
  return <div><div className="page-heading"><div><p className="eyebrow">INVENTORY NOTIFICATIONS</p><h1>Low-Stock Alerts</h1><p>Review products that reached or fell below their reorder levels.</p></div><button className="secondary-btn" onClick={load}><RefreshCw size={16} /> Refresh</button></div>{error && <div className="form-error page-message">{error}</div>}<div className="alert-summary-grid"><GlassCard className="alert-summary-card"><div className="alert-summary-icon active-summary"><ShieldAlert size={20} /></div><div><span>Active alerts</span><strong>{activeCount}</strong><small>Unread and read alerts</small></div></GlassCard><GlassCard className="alert-summary-card"><div className="alert-summary-icon unread-summary"><AlertTriangle size={20} /></div><div><span>Unread alerts</span><strong>{unreadCount}</strong><small>Need attention</small></div></GlassCard><GlassCard className="alert-summary-card"><div className="alert-summary-icon resolved-summary"><CheckCircle2 size={20} /></div><div><span>Resolved alerts</span><strong>{alerts.filter(alert => alert.status === 'resolved').length}</strong><small>Completed reviews</small></div></GlassCard></div><GlassCard className="alerts-container"><div className="section-heading"><div><h3>Alert center</h3><p>Critical out-of-stock alerts appear first.</p></div><AlertFilters value={filter} onChange={setFilter} /></div>{loading ? <div className="page-loading">Loading alerts...</div> : filtered.length ? <div className="alerts-list">{filtered.map(alert => <AlertCard key={alert._id} alert={alert} canResolve={['admin', 'manager'].includes(account.role)} onRead={id => safeAction(() => markRead(id))} onResolve={id => safeAction(() => resolve(id))} />)}</div> : <EmptyState title={filter === 'all' ? 'No low-stock alerts' : `No ${filter} alerts`} description="Products reaching their reorder level will appear here automatically." />}</GlassCard></div>;
}