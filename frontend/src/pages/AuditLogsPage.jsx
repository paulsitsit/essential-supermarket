import { useEffect, useState } from 'react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import { dateTime } from '../utils/format';
import { getErrorMessage } from '../utils/errors';

export default function AuditLogsPage() {
  const [data, setData] = useState({ rows: [] }); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const { data: result } = await client.get('/audit-logs?limit=100'); setData(result); } catch (err) { setError(getErrorMessage(err)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <div><div className="page-heading"><div><p className="eyebrow">ADMIN SECURITY</p><h1>Audit Logs</h1><p>Review account activity and inventory-impacting actions.</p></div></div>{error && <div className="form-error page-message">{error}</div>}<GlassCard className="table-card">{loading ? <div className="page-loading">Loading audit logs...</div> : data.rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Account</th><th>Role</th><th>Action</th><th>Affected record</th><th>IP address</th><th>Date and time</th></tr></thead><tbody>{data.rows.map(row => <tr key={row._id}><td>{row.accountName || row.account?.fullName || 'System'}</td><td>{row.accountRole || row.account?.role || '—'}</td><td><span className="movement-pill">{row.action.replaceAll('_', ' ')}</span></td><td className="mono-text">{row.affectedRecord || '—'}</td><td>{row.ipAddress || '—'}</td><td>{dateTime(row.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="No audit logs found" description="System actions will appear here." />}</GlassCard></div>;
}