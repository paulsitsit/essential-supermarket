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

export default function ReceiveStockModal({
  product,
  onClose,
  onSaved
}) {
  const [mode, setMode] = useState('receive'); // 'receive' | 'defect'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(
    receiveReasons[0]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reasons =
    mode === 'receive'
      ? receiveReasons
      : defectReasons;

  async function submit(event) {
    event.preventDefault();
    setError('');

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      setError(
        'Enter a whole quantity greater than zero.'
      );
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setBusy(true);

    try {
      const movementType =
        mode === 'receive'
          ? 'stock_in'
          : 'damaged';

      await client.post('/stock-movements', {
        productId: product._id,
        movementType,
        quantityChanged: qty,
        reason
      });

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

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {mode === 'receive'
                ? 'RECEIVE STOCK'
                : 'REPORT DEFECT'}
            </p>

            <h3>{product.name}</h3>
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
            <span>Barcode</span>
            <strong>{product.barcode}</strong>
          </div>

          <div>
            <span>SKU</span>
            <strong>{product.sku}</strong>
          </div>

          <div>
            <span>Current stock</span>
            <strong>
              {product.currentStock}{' '}
              {product.unitType}
            </strong>
          </div>

          <div>
            <span>Reorder level</span>
            <strong>
              {product.reorderLevel}{' '}
              {product.unitType}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <StatusBadge
              status={product.status}
            />
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
              onChange={event => {
                const nextMode =
                  event.target.value;

                setMode(nextMode);
                setQuantity('');
                setReason(
                  nextMode === 'receive'
                    ? receiveReasons[0]
                    : defectReasons[0]
                );
                setError('');
              }}
            >
              <option value="receive">
                Receive stock into inventory
              </option>

              <option value="defect">
                Report damaged / defective stock
              </option>
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={event =>
                setQuantity(event.target.value)
              }
              placeholder={
                mode === 'receive'
                  ? 'Enter quantity received'
                  : 'Enter quantity marked defective'
              }
              autoFocus
            />
          </label>

          <label>
            Reason
            <select
              value={reason}
              onChange={event =>
                setReason(event.target.value)
              }
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
              {busy
                ? 'Saving...'
                : mode === 'receive'
                  ? 'Save Stock Movement'
                  : 'Save Defect Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}