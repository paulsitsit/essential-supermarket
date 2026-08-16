import { useEffect, useState } from 'react';
import { Search, ClipboardList, FileText, RefreshCw } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { dateTime, dateOnly } from '../utils/format';

export default function BatchTracePage() {
  const { account } = useAuth();

  const [batchNumber, setBatchNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function search() {
    if (!batchNumber.trim()) {
      setError('Enter a batch number to search.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await client.get(`/batches/trace/${encodeURIComponent(batchNumber.trim())}`);
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to search batch'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setBatchNumber('');
    setResult(null);
    setError('');
  }

  const canManage = ['admin', 'manager'].includes(account?.role);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BATCH RECALL & TRACEABILITY</p>
          <h1>Batch Trace</h1>
          <p>Search a batch number to see current stock and all sales that used it.</p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={reset}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Reset
        </button>
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="table-card">
        <div className="filter-panel">
          <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Search size={16} style={{ color: '#888' }} />
            <input
              type="text"
              placeholder="Enter batch / lot number"
              value={batchNumber}
              onChange={e => setBatchNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={search}
            disabled={loading || !batchNumber.trim()}
          >
            Search
          </button>
        </div>

        {!result && !loading && (
          <EmptyState
            title="No search performed"
            description="Enter a batch number and click Search to view trace details."
          />
        )}

        {loading && (
          <div className="page-loading">Searching batch...</div>
        )}

        {result && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>
                <ClipboardList size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Batches found
              </h3>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch / lot</th>
                      <th>Current qty</th>
                      <th>Received</th>
                      <th>Expiration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.batches.map(batch => {
                      const product = batch.product || {};
                      return (
                        <tr key={batch._id}>
                          <td>
                            <strong>{product.name || 'Deleted product'}</strong>
                            <small className="table-subtext">
                              {product.barcode || '—'} · {product.sku || '—'}
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
                            {batch.expirationDate
                              ? dateOnly(batch.expirationDate)
                              : 'No expiry'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>
                <FileText size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Sales using this batch
              </h3>

              {result.sales.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sale date</th>
                        <th>Product</th>
                        <th>Qty from batch</th>
                        <th>Unit price</th>
                        <th>Subtotal</th>
                        <th>Cashier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sales.map((row, idx) => (
                        <tr key={`${row.saleId}-${row.batchId}-${idx}`}>
                          <td>{dateTime(row.saleDate)}</td>
                          <td>
                            <strong>{row.productName}</strong>
                            <small className="table-subtext">
                              {row.productBarcode || '—'}
                            </small>
                          </td>
                          <td>
                            <strong>{row.quantity}</strong>
                          </td>
                          <td>{row.unitPrice?.toFixed(2) || '0.00'}</td>
                          <td>{row.subtotal?.toFixed(2) || '0.00'}</td>
                          <td>
                            {row.cashier?.fullName || row.cashier?.email || '—'}
                            <small className="table-subtext">
                              {row.cashier?.role || ''}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No sales found"
                  description="This batch has not been used in any completed sales."
                />
              )}
            </div>

            {canManage && result.movements?.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>
                  Stock movements referencing this batch
                </h3>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Qty changed</th>
                        <th>Batch qty</th>
                        <th>Reason</th>
                        <th>Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.movements.map((m, idx) => (
                        <tr key={`${m.movementId}-${idx}`}>
                          <td>{dateTime(m.date)}</td>
                          <td>
                            <strong>{m.product}</strong>
                          </td>
                          <td>
                            <span className={`movement-pill movement-${m.movementType}`}>
                              {m.movementType}
                            </span>
                          </td>
                          <td className={m.quantityChanged >= 0 ? 'quantity-positive' : 'quantity-negative'}>
                            {m.quantityChanged >= 0 ? '+' : ''}{m.quantityChanged}
                          </td>
                          <td>{m.batchQuantity}</td>
                          <td>{m.reason || '—'}</td>
                          <td>{m.account}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}