import { useState } from 'react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';

export default function CategoryForm({ category, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '', status: category?.status || 'active' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { if (category) await client.put(`/categories/${category._id}`, form); else await client.post('/categories', form); onSaved(); } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); } }
  return <form className="inline-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label>Category name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Beverages" /></label><label>Description<textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Category description" /></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving...' : category ? 'Update category' : 'Create category'}</button></div></form>;
}