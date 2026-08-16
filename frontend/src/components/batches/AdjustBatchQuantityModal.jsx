import { useState } from 'react';
import { X } from 'lucide-react';

import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';
import { dateOnly } from '../../utils/format';

const adjustmentReasons = [
  'Physical stocktake',
  'Shrinkage / loss',
  'Expiry write-off',
  'Counting error correction',
  'Damaged not previously recorded',
  'Other'
];

export default function AdjustBatchQuantityModal({
  batch,
  product,
  onClose,
  onSaved
}) {
  const [reason, setReason] = useState(adjustmentReasons[0]);
  const [actualQuantity, setActualQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');

    const actual = Number(actualQuantity);

    if (!Number.isInteger(actual) || actual < 0) {
      setError('Enter a valid counted quantity (0 or more).');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setBusy(true);

    try {
      await client.post(`/batches/${batch._id}/adjust`, {
        actualQuantity: actual,
        reason: reason.trim()
      });

      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to adjust batch quantity'));
    } finally {
      setBusy(false);
    }
  }

  const currentQty = batch.quantity ?? 0;
  const actual = Number(actualQuantity || 0);
  const diff = Number.isFinite(actual) ? actual - currentQty : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">ADJUST BATCH QUANTITY</p>
            <h3>{product?.name || batch.product?.name || 'Product'}</h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="stock-summary">
          <div>
            <span>Batch / lot</span>
            <strong className="mono-text">{batch.batchNumber || '—'}</strong>
          </div>

          <div>
            <span>Current batch qty</span>
            <strong>{currentQty}</strong>
          </div>

          <div>
            <span>Received date</span>
            <strong>
              {batch.receivedDate ? dateOnly(batch.receivedDate) : '—'}
            </strong>
          </div>

          <div>
            <span>Expiration</span>
            <strong>
              {batch.expirationDate
                ? dateOnly(batch.expirationDate)
                : 'No expiry'}
            </strong>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={submit} className="modal-form">
          <label>
            Reason for adjustment
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              {adjustmentReasons.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label>
            Counted quantity (actual on hand)
            <input
              type="number"
              min="0"
              step="1"
              value={actualQuantity}
              onChange={e => setActualQuantity(e.target.value)}
              placeholder={`Current: ${currentQty}`}
              autoFocus
            />
          </label>

          <div
            style={{
              fontSize: 13,
              padding: '8px 10px',
              borderRadius: 6,
              background:
                diff === 0
                  ? '#f0fdf4'
                  : diff < 0
                  ? '#fef2f2'
                  : '#fff7ed',
              border:
                diff === 0
                  ? '1px solid #bbf7d0'
                  : diff < 0
                  ? '1px solid #fecaca'
                  : '1px solid #fed7aa',
              color:
                diff === 0
                  ? '#14532d'
                  : diff < 0
                  ? '#7f1d1d'
                  : '#7c2d12'
            }}
          >
            Adjustment:{" "}
            <strong style={{ fontWeight: 800 }}>
              {diff >= 0 ? '+' : ''}{diff}
            </strong>{" "}
            units
            {diff !== 0 && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                ({diff < 0 ? 'reduce' : 'increase'} batch and product stock)
              </span>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-btn"
              disabled={busy || !actualQuantity}
            >
              {busy ? 'Saving...' : 'Save adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}