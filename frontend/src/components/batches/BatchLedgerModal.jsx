import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

import { getBatchLedger, getBatchVariance } from '../../api/stockLedger';
import { getErrorMessage } from '../../utils/errors';
import { dateTime } from '../../utils/format';

function getId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

function formatQuantity(value) {
  const quantity = Number(value || 0);
  return `${quantity > 0 ? '+' : ''}${quantity}`;
}

export default function BatchLedgerModal({
  batch,
  product,
  onClose
}) {
  const [ledger, setLedger] = useState(null);
  const [variance, setVariance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    const batchId = getId(batch?._id);

    if (!batchId) {
      setError('This batch does not have a valid ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [ledgerResult, varianceResult] = await Promise.all([
        getBatchLedger(batchId, { limit: 100 }),
        getBatchVariance(batchId)
      ]);

      setLedger(ledgerResult);
      setVariance(varianceResult);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load batch ledger.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [batch?._id]);

  const entries = ledger?.entries || [];
  const varianceValue = Number(
    variance?.variance ?? 0
  );

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-ledger-title"
        style={{ maxWidth: 1100 }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              INVENTORY AUDIT TRAIL
            </p>

            <h3 id="batch-ledger-title">
              {product?.name || 'Batch ledger'}
            </h3>

            <small className="table-subtext">
              Batch: {batch?.batchNumber || '—'}
            </small>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              onClick={load}
              disabled={loading}
              title="Refresh ledger"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              disabled={loading}
              aria-label="Close batch ledger"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="stock-summary">
          <div>
            <span>Current batch quantity</span>
            <strong>{batch?.quantity ?? 0}</strong>
          </div>

          <div>
            <span>Ledger quantity</span>
            <strong>
              {variance?.ledgerStock ?? '—'}
            </strong>
          </div>

          <div>
            <span>Variance</span>
            <strong
              style={{
                color:
                  varianceValue === 0
                    ? '#166534'
                    : '#b91c1c'
              }}
            >
              {variance
                ? formatQuantity(varianceValue)
                : '—'}
            </strong>
          </div>

          <div>
            <span>Expiration</span>
            <strong>
              {batch?.expirationDate
                ? new Date(
                    batch.expirationDate
                  ).toLocaleDateString()
                : 'No expiry'}
            </strong>
          </div>
        </div>

        {error && (
          <div className="form-error page-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="page-loading">
            Loading batch ledger...
          </div>
        ) : entries.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Movement</th>
                  <th>Quantity</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reason</th>
                  <th>Performed by</th>
                </tr>
              </thead>

              <tbody>
                {entries.map(entry => {
                  const quantity = Number(
                    entry.quantityChanged || 0
                  );

                  const performedBy =
                    entry.performedBy || {};

                  return (
                    <tr key={entry._id}>
                      <td>
                        {dateTime(entry.createdAt)}
                      </td>

                      <td>
                        <span
                          className={`movement-pill movement-${entry.movementType}`}
                        >
                          {entry.movementType}
                        </span>
                      </td>

                      <td
                        className={
                          quantity >= 0
                            ? 'quantity-positive'
                            : 'quantity-negative'
                        }
                      >
                        {formatQuantity(quantity)}
                      </td>

                      <td>
                        {entry.batchStockBefore}
                      </td>

                      <td>
                        {entry.batchStockAfter}
                      </td>

                      <td>
                        {entry.reason || '—'}
                      </td>

                      <td>
                        {performedBy.fullName ||
                          performedBy.email ||
                          '—'}
                        <small className="table-subtext">
                          {performedBy.role || ''}
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="page-message">
            No ledger entries exist for this batch yet.
          </div>
        )}
      </div>
    </div>
  );
}