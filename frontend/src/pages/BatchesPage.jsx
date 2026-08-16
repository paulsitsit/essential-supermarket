import { useEffect, useState } from 'react';
import { CalendarClock, Filter, RefreshCw, Search, AlertTriangle, Settings } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import ExpiryCorrectionModal from '../components/batches/ExpiryCorrectionModal';
import DamageBatchModal from '../components/batches/DamageBatchModal';
import AdjustBatchQuantityModal from '../components/batches/AdjustBatchQuantityModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getErrorMessage } from '../utils/errors';
import { dateOnly } from '../utils/format';

const EXPIRY_FILTERS = [
  { label: 'All batches', value: 'all' },
  { label: 'Expiring in 7 days', value: '7' },
  { label: 'Expiring in 14 days', value: '14' },
  { label: 'Expiring in 30 days', value: '30' },
  { label: 'Already expired', value: 'expired' },
  { label: 'No expiry date', value: 'no_expiry' }
];

export default function BatchesPage() {
  const { account } = useAuth();
  const { lastEvent } = useSocket();

  const [batches, setBatches] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('all');

  const [editingBatch, setEditingBatch] = useState(null);
  const [damagingBatch, setDamagingBatch] = useState(null);
  const [adjustingBatch, setAdjustingBatch] = useState(null);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [batchesRes, productsRes] = await Promise.all([
        client.get('/batches'),
        client.get('/products')
      ]);

      const rows = batchesRes.data || [];
      const productsList = productsRes.data || [];

      const map = {};
      for (const p of productsList) {
        map[p._id] = p;
      }

      setBatches(rows);
      setProductsMap(map);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load batches'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [lastEvent]);

  const filtered = batches.filter(batch => {
    const product = productsMap[batch.productId] || batch.product;
    const productName = (product?.name || '').toLowerCase();
    const batchNumber = (batch.batchNumber || '').toLowerCase();

    const matchesSearch =
      !search ||
      productName.includes(search.toLowerCase()) ||
      batchNumber.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const exp = batch.expirationDate ? new Date(batch.expirationDate) : null;

    if (expiryFilter === 'all') return true;

    if (expiryFilter === 'expired') {
      return exp && exp < today;
    }

    if (expiryFilter === 'no_expiry') {
      return !batch.expirationDate;
    }

    const days = Number(expiryFilter);
    if (!exp) return false;

    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);

    return exp >= today && exp <= limit;
  });

  const canEdit = ['admin', 'manager'].includes(account?.role);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BATCH MANAGEMENT</p>
          <h1>Batches</h1>
          <p>View active batches, quantities, and expiration dates.</p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="table-card">
        <div className="filter-panel">
          <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Search size={16} style={{ color: '#888' }} />
            <input
              type="text"
              placeholder="Search by product or batch number"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: '#888' }} />
            <select
              value={expiryFilter}
              onChange={e => setExpiryFilter(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              {EXPIRY_FILTERS.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="page-loading">Loading batches...</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch / lot</th>
                  <th>Quantity</th>
                  <th>Received</th>
                  <th>Expiration</th>
                  <th>Days left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(batch => {
                  const product = productsMap[batch.productId] || batch.product;
                  const exp = batch.expirationDate ? new Date(batch.expirationDate) : null;
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  let daysLeft = null;
                  if (exp) {
                    const diff = exp.getTime() - today.getTime();
                    daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <tr key={batch._id}>
                      <td>
                        <strong>{product?.name || 'Deleted product'}</strong>
                        <small className="table-subtext">
                          {product?.barcode || '—'} · {product?.sku || '—'}
                        </small>
                      </td>
                      <td>
                        <strong className="mono-text">{batch.batchNumber || '—'}</strong>
                      </td>
                      <td>
                        <strong>{batch.quantity ?? 0}</strong>
                      </td>
                      <td>
                        {batch.receivedDate ? dateOnly(batch.receivedDate) : '—'}
                      </td>
                      <td>
                        {exp ? (
                          <span
                            className={
                              daysLeft < 0
                                ? 'status-critical'
                                : daysLeft <= 7
                                ? 'status-warning'
                                : ''
                            }
                            style={{
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                          >
                            {dateOnly(batch.expirationDate)}
                          </span>
                        ) : (
                          'No expiry'
                        )}
                      </td>
                      <td>
                        {daysLeft === null ? (
                          '—'
                        ) : daysLeft < 0 ? (
                          <span className="status-critical" style={{ fontWeight: 700 }}>
                            Expired {Math.abs(daysLeft)}d ago
                          </span>
                        ) : (
                          <span
                            style={{
                              fontWeight: 600,
                              color:
                                daysLeft <= 7
                                  ? '#b45309'
                                  : '#065f46'
                            }}
                          >
                            {daysLeft} days
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                className="row-icon"
                                title="Edit expiry"
                                onClick={() =>
                                  setEditingBatch({ batch, product })
                                }
                              >
                                <CalendarClock size={16} />
                              </button>

                              <button
                                type="button"
                                className="row-icon"
                                title="Adjust quantity"
                                onClick={() =>
                                  setAdjustingBatch({ batch, product })
                                }
                              >
                                <Settings size={16} />
                              </button>

                              <button
                                type="button"
                                className="row-icon"
                                title="Mark as damaged / destroy"
                                onClick={() =>
                                  setDamagingBatch({ batch, product })
                                }
                              >
                                <AlertTriangle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No batches found"
            description="Adjust your filters or receive stock to create batches."
          />
        )}
      </GlassCard>

      {editingBatch && (
        <ExpiryCorrectionModal
          batch={editingBatch.batch}
          product={editingBatch.product}
          onClose={() => setEditingBatch(null)}
          onSaved={() => {
            setEditingBatch(null);
            load();
          }}
        />
      )}

      {damagingBatch && (
        <DamageBatchModal
          batch={damagingBatch.batch}
          product={damagingBatch.product}
          onClose={() => setDamagingBatch(null)}
          onSaved={() => {
            setDamagingBatch(null);
            load();
          }}
        />
      )}

      {adjustingBatch && (
        <AdjustBatchQuantityModal
          batch={adjustingBatch.batch}
          product={adjustingBatch.product}
          onClose={() => setAdjustingBatch(null)}
          onSaved={() => {
            setAdjustingBatch(null);
            load();
          }}
        />
      )}
    </div>
  );
}