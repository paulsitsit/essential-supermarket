import { useState } from 'react';
import { X } from 'lucide-react';

import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';

function toInputDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!batch?._id) {
      setError('Batch information is missing.');
      return;
    }

    const trimmedBatchNumber = batchNumber.trim();

    if (!trimmedBatchNumber) {
      setError('Batch / lot number is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await client.put(`/batches/${batch._id}`, {
        expirationDate: expirationDate || null,
        batchNumber: trimmedBatchNumber
      });

      onSaved?.();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to update this batch'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropMouseDown(event) {
    if (
      event.target === event.currentTarget &&
      !saving
    ) {
      onClose?.();
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="modal-card expiry-correction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expiry-correction-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              CORRECT BATCH
            </p>

            <h3 id="expiry-correction-title">
              {product?.name || 'Product'}
            </h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            aria-label="Close batch correction dialog"
            onClick={onClose}
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="modal-form"
        >
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <label>
            Expiration date
            <input
              type="date"
              value={expirationDate}
              onChange={event =>
                setExpirationDate(event.target.value)
              }
            />
          </label>

          <label>
            Batch / lot number
            <input
              type="text"
              value={batchNumber}
              onChange={event =>
                setBatchNumber(event.target.value)
              }
              placeholder="Enter batch / lot number"
              required
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
              {saving
                ? 'Saving...'
                : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}