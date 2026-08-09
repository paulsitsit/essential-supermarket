import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import ManagementTable from '../components/management/ManagementTable';
import CategoryForm from '../components/management/CategoryForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getErrorMessage } from '../utils/errors';

export default function CategoriesPage() {
  const [rows, setRows] = useState([]); const [editing, setEditing] = useState(null); const [formOpen, setFormOpen] = useState(false); const [confirm, setConfirm] = useState(null); const [error, setError] = useState('');
  async function load() { try { const { data } = await client.get('/categories'); setRows(data); } catch (err) { setError(getErrorMessage(err)); } }
  useEffect(() => { load(); }, []);
  async function remove() { try { await client.delete(`/categories/${confirm._id}`); setConfirm(null); load(); } catch (err) { setError(getErrorMessage(err)); setConfirm(null); } }
  const columns = [{ key: 'name', label: 'Category', render: row => <strong>{row.name}</strong> }, { key: 'description', label: 'Description' }, { key: 'productCount', label: 'Products' }, { key: 'totalQuantity', label: 'Total quantity' }, { key: 'status', label: 'Status', render: row => <span className={`simple-status ${row.status}`}>{row.status}</span> }, { key: 'createdAt', label: 'Created' }];
  return <div><div className="page-heading"><div><p className="eyebrow">PRODUCT ORGANIZATION</p><h1>Categories</h1><p>Organize registered supermarket products.</p></div><button className="primary-btn" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={17} /> Add Category</button></div>{error && <div className="form-error page-message">{error}</div>}<GlassCard className="table-card"><ManagementTable columns={columns} rows={rows} onEdit={row => { setEditing(row); setFormOpen(true); }} onDelete={setConfirm} empty="No categories have been created." /></GlassCard>{formOpen && <div className="modal-backdrop"><div className="modal-card management-modal"><div className="modal-header"><h3>{editing ? 'Edit category' : 'Create category'}</h3></div><CategoryForm category={editing} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} /></div></div>}<ConfirmDialog open={Boolean(confirm)} title="Delete category?" message={`Delete ${confirm?.name || 'this category'}? Categories assigned to products cannot be deleted.`} onCancel={() => setConfirm(null)} onConfirm={remove} danger confirmText="Delete" /></div>;
}