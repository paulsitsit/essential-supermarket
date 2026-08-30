import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Package, CheckCircle } from 'lucide-react';
import { dateOnly, peso } from '../utils/format';
import EmptyState from '../components/common/EmptyState';
import LoadingScreen from '../components/common/LoadingScreen';
import ConfirmDialog from '../components/common/ConfirmDialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function QuarantinePage({ account }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending_inspection');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const url = `${API}/quarantine?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  async function handleAction(id, action, notes) {
    const res = await fetch(`${API}/quarantine/${id}/${action}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error('Action failed');
    return res.json();
  }

  function refresh() {
    const url = `${API}/quarantine?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => setItems(data.items || []));
  }

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUARANTINE</p>
          <h1>Quarantine items</h1>
        </div>
        <div className="heading-actions">
          <button className="secondary-btn" onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="filter-panel">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="pending_inspection">Pending inspection</option>
          <option value="disposed">Disposed</option>
          <option value="returned_to_supplier">Returned to supplier</option>
          <option value="released_to_stock">Released to stock</option>
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No items" description={`No ${filter.replace('_', ' ')} items.`} />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Condition</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it._id}>
                    <td>
                      <strong>{it.product?.name || it.name}</strong>
                      <small className="table-subtext">{it.barcode || '—'}</small>
                    </td>
                    <td>{it.quantity}</td>
                    <td>{it.condition}</td>
                    <td>{it.source}</td>
                    <td>{dateOnly(it.createdAt)}</td>
                    <td>
                      <span className={`status-badge status-${it.status === 'pending_inspection' ? 'lowstock' : 'normal'}`}>
                        {it.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {it.status === 'pending_inspection' && (
                          <>
                            <button
                              className="row-icon danger-icon"
                              title="Dispose"
                              onClick={() => setConfirm({ type: 'dispose', item: it })}
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              className="row-icon"
                              title="Return to supplier"
                              onClick={() => setConfirm({ type: 'return', item: it })}
                            >
                              <Package size={14} />
                            </button>
                            <button
                              className="row-icon"
                              title="Release to stock"
                              onClick={() => setConfirm({ type: 'release', item: it })}
                            >
                              <CheckCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.type === 'dispose'
              ? 'Dispose item'
              : confirm.type === 'return'
              ? 'Return to supplier'
              : 'Release to stock'
          }
          description={
            confirm.type === 'dispose'
              ? `Dispose ${confirm.item.quantity} × ${confirm.item.name}?`
              : confirm.type === 'return'
              ? `Return ${confirm.item.quantity} × ${confirm.item.name} to supplier?`
              : `Release ${confirm.item.quantity} × ${confirm.item.name} to sellable stock?`
          }
          confirmText={confirm.type === 'dispose' ? 'Dispose' : confirm.type === 'return' ? 'Return' : 'Release'}
          onConfirm={async () => {
            await handleAction(
              confirm.item._id,
              confirm.type === 'dispose' ? 'dispose' : confirm.type === 'return' ? 'returnToSupplier' : 'release',
              'Manager action'
            );
            refresh();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}