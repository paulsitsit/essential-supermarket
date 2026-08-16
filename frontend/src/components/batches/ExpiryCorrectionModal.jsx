import { useState } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';

function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ExpiryCorrectionModal({
  batch,
  product,
  onClose,
  onSaved
}) {
  const [expirationDate, setExpirationDate] = useState(
    toInputDate(batch?.expirationDate)
  );
  const [batchNumber, setBatchNumber] = useState(
    batch?.batchNumber || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await client.put(`/batches/${batch._id}`, {
        expirationDate: expirationDate || null,
        batchNumber
      });

      onSaved();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to update this batch')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 420, width: '100%' }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">CORRECT BATCH</p>
            <h3 style={{ margin: 0 }}>
              {product?.name || 'Product'}
            </h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="form-error">{error}</div>
          )}

          <label className="form-field">
            <span>Expiration date</span>
            <input
              type="date"
              value={expirationDate}
              onChange={e =>
                setExpirationDate(e.target.value)
              }
            />
          </label>

          <label className="form-field">
            <span>Batch / lot number</span>
            <input
              type="text"
              value={batchNumber}
              onChange={e =>
                setBatchNumber(e.target.value)
              }
              placeholder="Optional"
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}