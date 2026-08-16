    import { useState } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';
import { dateOnly } from '../../utils/format';

const damageReasons = [
  'Damaged packaging',
  'Defective product',
  'Spoiled / contaminated',
  'Expired on shelf',
  'Customer return as defective',
  'Other defect'
];

const destroyReasons = [
  'Expired and unsellable',
  'Severely damaged',
  'Contaminated / unsafe',
  'Recall disposal',
  'Other'
];

export default function DamageBatchModal({
  batch,
  product,
  onClose,
  onSaved
}) {
  const [action, setAction] = useState('damaged'); // 'damaged' | 'destroyed'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(damageReasons[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reasons = action === 'damaged' ? damageReasons : destroyReasons;

  async function submit(event) {
    event.preventDefault();
    setError('');

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a whole quantity greater than zero.');
      return;
    }

    if (qty > (batch.quantity ?? 0)) {
      setError('Quantity cannot exceed current batch quantity.');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setBusy(true);

    try {
      await client.post(`/batches/${batch._id}/damage`, {
        action,
        quantity: qty,
        reason
      });

      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update batch'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {action === 'damaged' ? 'MARK AS DAMAGED' : 'DESTROY STOCK'}
            </p>
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
            <strong>{batch.quantity ?? 0}</strong>
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
            Action
            <select
              value={action}
              onChange={e => {
                const next = e.target.value;
                setAction(next);
                setReason(
                  next === 'damaged'
                    ? damageReasons[0]
                    : destroyReasons[0]
                );
                setQuantity('');
                setError('');
              }}
            >
              <option value="damaged">Mark as damaged</option>
              <option value="destroyed">Destroy stock</option>
            </select>
          </label>

          <label>
            Quantity to {action}
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder={`Max ${batch.quantity ?? 0}`}
              autoFocus
            />
          </label>

          <label>
            Reason
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              {reasons.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

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
              disabled={busy}
            >
              {busy ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}