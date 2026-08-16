import { useState } from 'react';
import { X } from 'lucide-react';

import client from '../../api/client';
import StatusBadge from '../common/StatusBadge';
import { getErrorMessage } from '../../utils/errors';

const receiveReasons = [
  'New delivery received',
  'Returned stock',
  'Branch transfer',
  'Inventory correction'
];

const defectReasons = [
  'Damaged packaging',
  'Defective product',
  'Spoiled / contaminated',
  'Expired on shelf',
  'Customer return as defective',
  'Other defect'
];

function generateBatchNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);

  return `LOT-${year}-${month}-${day}-${random}`;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function ReceiveStockModal({
  product,
  onClose,
  onSaved
}) {
  const [mode, setMode] = useState('receive');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(receiveReasons[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [expirationDate, setExpirationDate] = useState('');
  const [batchNumber, setBatchNumber] = useState(() =>
    generateBatchNumber()
  );
  const [receivedDate, setReceivedDate] = useState(() =>
    getTodayInputValue()
  );

  const reasons =
    mode === 'receive'
      ? receiveReasons
      : defectReasons;

  async function submit(event) {
    event.preventDefault();
    setError('');

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a whole quantity greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    if (mode === 'receive' && !receivedDate) {
      setError('Received date is required.');
      return;
    }

    setBusy(true);

    try {
      if (mode === 'receive') {
        await client.post('/batches/receive', {
          productId: product._id,
          quantity: qty,
          reason: reason.trim(),
          batchNumber:
            batchNumber.trim() ||
            generateBatchNumber(),
          receivedDate,
          expirationDate: expirationDate || null
        });
      } else {
        await client.post('/stock-movements', {
          productId: product._id,
          movementType: 'damaged',
          quantityChanged: qty,
          reason: reason.trim()
        });
      }

      onSaved?.();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to save stock movement'
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function handleModeChange(event) {
    const nextMode = event.target.value;

    setMode(nextMode);
    setQuantity('');
    setReason(
      nextMode === 'receive'
        ? receiveReasons[0]
        : defectReasons[0]
    );
    setError('');
  }

  function handleBackdropMouseDown(event) {
    if (
      event.target === event.currentTarget &&
      !busy
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
        className="modal-card receive-stock-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-stock-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {mode === 'receive'
                ? 'RECEIVE STOCK'
                : 'REPORT DEFECT'}
            </p>

            <h3 id="receive-stock-title">
              {product?.name || 'Product'}
            </h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={busy}
            aria-label="Close stock dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="stock-summary">
          <div>
            <span>Barcode</span>
            <strong>{product?.barcode || '—'}</strong>
          </div>

          <div>
            <span>SKU</span>
            <strong>{product?.sku || '—'}</strong>
          </div>

          <div>
            <span>Current stock</span>
            <strong>
              {product?.currentStock ?? 0}{' '}
              {product?.unitType || 'units'}
            </strong>
          </div>

          <div>
            <span>Reorder level</span>
            <strong>
              {product?.reorderLevel ?? 0}{' '}
              {product?.unitType || 'units'}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <StatusBadge status={product?.status} />
          </div>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="modal-form"
        >
          <label>
            Stock action
            <select
              value={mode}
              onChange={handleModeChange}
              disabled={busy}
            >
              <option value="receive">
                Receive stock into inventory
              </option>

              <option value="defect">
                Report damaged / defective stock
              </option>
            </select>
          </label>

          {mode === 'receive' && (
            <>
              <label>
                Quantity received
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={event =>
                    setQuantity(event.target.value)
                  }
                  placeholder="Enter quantity received"
                  autoFocus
                  disabled={busy}
                />
              </label>

              <label>
                Expiration date (optional)
                <input
                  type="date"
                  value={expirationDate}
                  onChange={event =>
                    setExpirationDate(event.target.value)
                  }
                  disabled={busy}
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
                  placeholder="LOT-YYYY-MM-DD-XXXX"
                  disabled={busy}
                />
              </label>

              <label>
                Received date
                <input
                  type="date"
                  value={receivedDate}
                  onChange={event =>
                    setReceivedDate(event.target.value)
                  }
                  required
                  disabled={busy}
                />
              </label>

              <label>
                Reason
                <select
                  value={reason}
                  onChange={event =>
                    setReason(event.target.value)
                  }
                  disabled={busy}
                >
                  {reasons.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {mode === 'defect' && (
            <>
              <label>
                Quantity defective
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={event =>
                    setQuantity(event.target.value)
                  }
                  placeholder="Enter defective quantity"
                  autoFocus
                  disabled={busy}
                />
              </label>

              <label>
                Reason
                <select
                  value={reason}
                  onChange={event =>
                    setReason(event.target.value)
                  }
                  disabled={busy}
                >
                  {reasons.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-btn"
              disabled={busy}
            >
              {busy
                ? 'Saving...'
                : mode === 'receive'
                ? 'Receive stock'
                : 'Save defect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}