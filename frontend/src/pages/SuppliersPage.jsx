import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import ManagementTable from '../components/management/ManagementTable';
import SupplierForm from '../components/management/SupplierForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getErrorMessage } from '../utils/errors';

export default function SuppliersPage() {
  const [rows, setRows] = useState([]); const [editing, setEditing] = useState(null); const [formOpen, setFormOpen] = useState(false); const [confirm, setConfirm] = useState(null); const [error, setError] = useState('');
  async function load() { try { const { data } = await client.get('/suppliers'); setRows(data); } catch (err) { setError(getErrorMessage(err)); } }
  useEffect(() => { load(); }, []);
  async function remove() { try { await client.delete(`/suppliers/${confirm._id}`); setConfirm(null); load(); } catch (err) { setError(getErrorMessage(err)); setConfirm(null); } }
  const columns = [{ key: 'name', label: 'Supplier', render: row => <strong>{row.name}</strong> }, { key: 'contactPerson', label: 'Contact person' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'productsSupplied', label: 'Products supplied' }, { key: 'totalItemsSupplied', label: 'Total items' }, { key: 'status', label: 'Status', render: row => <span className={`simple-status ${row.status}`}>{row.status}</span> }, { key: 'createdAt', label: 'Created' }];
  return <div><div className="page-heading"><div><p className="eyebrow">INVENTORY SOURCES</p><h1>Suppliers</h1><p>Manage inventory suppliers without payment or purchase-order processing.</p></div><button className="primary-btn" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={17} /> Add Supplier</button></div>{error && <div className="form-error page-message">{error}</div>}<GlassCard className="table-card"><ManagementTable columns={columns} rows={rows} onEdit={row => { setEditing(row); setFormOpen(true); }} onDelete={setConfirm} empty="No suppliers have been created." /></GlassCard>{formOpen && <div className="modal-backdrop"><div className="modal-card management-modal"><div className="modal-header"><h3>{editing ? 'Edit supplier' : 'Create supplier'}</h3></div><SupplierForm supplier={editing} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} /></div></div>}<ConfirmDialog open={Boolean(confirm)} title="Delete supplier?" message={`Delete ${confirm?.name || 'this supplier'}? Suppliers assigned to products cannot be deleted.`} onCancel={() => setConfirm(null)} onConfirm={remove} danger confirmText="Delete" /></div>;
}