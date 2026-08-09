import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import ManagementTable from '../components/management/ManagementTable';
import AccountForm from '../components/management/AccountForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getErrorMessage } from '../utils/errors';

export default function AccountsPage() {
  const [rows, setRows] = useState([]); const [editing, setEditing] = useState(null); const [formOpen, setFormOpen] = useState(false); const [confirm, setConfirm] = useState(null); const [error, setError] = useState('');
  async function load() { try { const { data } = await client.get('/accounts'); setRows(data); } catch (err) { setError(getErrorMessage(err)); } }
  useEffect(() => { load(); }, []);
  async function toggle(account) { try { await client.patch(`/accounts/${account.id}/status`, { status: account.status === 'active' ? 'inactive' : 'active' }); load(); } catch (err) { setError(getErrorMessage(err)); } }
  async function remove() { try { await client.delete(`/accounts/${confirm.id}`); setConfirm(null); load(); } catch (err) { setError(getErrorMessage(err)); setConfirm(null); } }
  const columns = [{ key: 'fullName', label: 'Account', render: row => <div className="table-product"><div className="avatar">{row.fullName?.charAt(0)}</div><strong>{row.fullName}</strong></div> }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: row => <span className={`role-pill role-${row.role}`}>{row.role}</span> }, { key: 'status', label: 'Status', render: row => <span className={`simple-status ${row.status}`}>{row.status}</span> }, { key: 'branch', label: 'Branch / warehouse' }, { key: 'lastLogin', label: 'Last login' }, { key: 'createdAt', label: 'Created' }];
  return <div><div className="page-heading"><div><p className="eyebrow">SYSTEM ACCESS</p><h1>Account Management</h1><p>Create and manage Admin, Manager, and Staff accounts.</p></div><button className="primary-btn" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={17} /> Create Account</button></div>{error && <div className="form-error page-message">{error}</div>}<GlassCard className="table-card"><ManagementTable columns={columns} rows={rows} onEdit={row => { setEditing(row); setFormOpen(true); }} onToggle={toggle} onDelete={setConfirm} empty="No system accounts have been created." /></GlassCard>{formOpen && <div className="modal-backdrop"><div className="modal-card management-modal"><div className="modal-header"><h3>{editing ? 'Edit account' : 'Create account'}</h3></div><AccountForm account={editing} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} /></div></div>}<ConfirmDialog open={Boolean(confirm)} title="Delete account?" message={`Delete ${confirm?.fullName || 'this account'}? This action cannot be undone.`} onCancel={() => setConfirm(null)} onConfirm={remove} danger confirmText="Delete" /></div>;
}