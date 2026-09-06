import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  X
} from 'lucide-react';

import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';
import { dateOnly } from '../../utils/format';

const adjustmentReasons = [
  'Physical stocktake',
  'Shrinkage / loss',
  'Expiry write-off',
  'Counting error correction',
  'Damaged not previously recorded',
  'Supplier discrepancy',
  'Opening stock correction',
  'Other'
];

function getNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getAdjustmentTone(difference) {
  if (difference === 0) {
    return {
      background: '#f0fdf4',
      border: '#bbf7d0',
      color: '#14532d',
      Icon: CheckCircle2,
      label: 'No stock change'
    };
  }

  if (difference < 0) {
    return {
      background: '#fef2f2',
      border: '#fecaca',
      color: '#991b1b',
      Icon: Minus,
      label: 'Stock reduction'
    };
  }

  return {
    background: '#fff7ed',
    border: '#fed7aa',
    color: '#9a3412',
    Icon: Plus,
    label: 'Stock increase'
  };
}

export default function AdjustBatchQuantityModal({
  batch,
  product,
  onClose,
  onSaved
}) {
  const [reason, setReason] = useState(
    adjustmentReasons[0]
  );

  const [notes, setNotes] = useState('');

  /*
   * Keep the input blank initially. That prevents the modal
   * from looking like it will change stock to zero before the
   * manager enters an actual physical count.
   */
  const [actualQuantity, setActualQuantity] =
    useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentBatchQuantity = getNumber(
    batch?.quantity,
    0
  );

  const currentProductStock = getNumber(
    product?.currentStock ??
      batch?.product?.currentStock,
    0
  );

  const parsedActualQuantity = Number(
    actualQuantity
  );

  const hasEnteredQuantity =
    actualQuantity !== '' &&
    Number.isInteger(parsedActualQuantity) &&
    parsedActualQuantity >= 0;

  const difference = hasEnteredQuantity
    ? parsedActualQuantity - currentBatchQuantity
    : null;

  const resultingProductStock =
    difference === null
      ? null
      : currentProductStock + difference;

  const adjustmentTone = useMemo(
    () =>
      getAdjustmentTone(
        difference === null ? 0 : difference
      ),
    [difference]
  );

  const AdjustmentIcon = adjustmentTone.Icon;

  const productName =
    product?.name ||
    batch?.product?.name ||
    'Product';

  const productBarcode =
    product?.barcode ||
    batch?.product?.barcode ||
    '—';

  function handleActualQuantityChange(value) {
    /*
     * Permit an empty field while typing.
     * Reject decimals, negative symbols, exponent values,
     * and other invalid number-input strings.
     */
    if (value === '') {
      setActualQuantity('');
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    setActualQuantity(value);
  }

  async function submit(event) {
    event.preventDefault();

    setError('');

    if (!hasEnteredQuantity) {
      setError(
        'Enter the actual counted batch quantity as a whole number of 0 or more.'
      );

      return;
    }

    if (!reason.trim()) {
      setError('Select a reason for this adjustment.');
      return;
    }

    if (!notes.trim()) {
      setError(
        'Enter a short explanation for this stock adjustment.'
      );

      return;
    }

    if (resultingProductStock < 0) {
      setError(
        'This adjustment would make the total product stock negative. Check the counted batch quantity.'
      );

      return;
    }

    setBusy(true);

    try {
      await client.post(
        `/batches/${batch._id}/adjust`,
        {
          actualQuantity: parsedActualQuantity,
          reason: `${reason.trim()}: ${notes.trim()}`
        }
      );

      onSaved?.();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to adjust batch quantity.'
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (
          !busy &&
          event.target === event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-batch-title"
        style={{ maxWidth: 680 }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              STOCK ADJUSTMENT
            </p>

            <h3 id="adjust-batch-title">
              {productName}
            </h3>

            <small className="table-subtext">
              {productBarcode}
            </small>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close stock adjustment form"
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>

        <div className="stock-summary">
          <div>
            <span>Batch / lot</span>

            <strong className="mono-text">
              {batch?.batchNumber || '—'}
            </strong>
          </div>

          <div>
            <span>Current batch quantity</span>

            <strong>
              {currentBatchQuantity}
            </strong>
          </div>

          <div>
            <span>Current product stock</span>

            <strong>
              {currentProductStock}
            </strong>
          </div>

          <div>
            <span>Received date</span>

            <strong>
              {batch?.receivedDate
                ? dateOnly(batch.receivedDate)
                : '—'}
            </strong>
          </div>

          <div>
            <span>Expiration date</span>

            <strong>
              {batch?.expirationDate
                ? dateOnly(batch.expirationDate)
                : 'No expiry'}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            margin: '16px 0',
            padding: '12px 14px',
            border: '1px solid #fde68a',
            borderRadius: 10,
            background: '#fffbeb',
            color: '#854d0e',
            fontSize: 13,
            lineHeight: 1.5
          }}
        >
          <AlertTriangle
            size={18}
            style={{
              flexShrink: 0,
              marginTop: 1
            }}
          />

          <span>
            This action permanently changes the selected
            batch quantity and total product stock. It will
            create a stock-adjustment movement and audit-log
            record.
          </span>
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
            Reason for adjustment

            <select
              value={reason}
              onChange={event =>
                setReason(event.target.value)
              }
              disabled={busy}
            >
              {adjustmentReasons.map(
                adjustmentReason => (
                  <option
                    key={adjustmentReason}
                    value={adjustmentReason}
                  >
                    {adjustmentReason}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Actual counted quantity

            <span className="field-hint">
              Enter the total number of units physically
              present in this batch.
            </span>

            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={actualQuantity}
              onChange={event =>
                handleActualQuantityChange(
                  event.target.value
                )
              }
              placeholder={`Current: ${currentBatchQuantity}`}
              autoFocus
              disabled={busy}
            />
          </label>

          <label>
            Explanation

            <span className="field-hint">
              Required. State what was counted, found, or
              corrected.
            </span>

            <textarea
              rows="3"
              value={notes}
              onChange={event =>
                setNotes(event.target.value)
              }
              placeholder="Example: Physical shelf count found three units missing."
              disabled={busy}
            />
          </label>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${adjustmentTone.border}`,
              background: adjustmentTone.background,
              color: adjustmentTone.color,
              fontSize: 13,
              lineHeight: 1.45
            }}
          >
            <AdjustmentIcon
              size={18}
              style={{
                flexShrink: 0,
                marginTop: 1
              }}
            />

            {difference === null ? (
              <div>
                <strong>
                  Enter a counted quantity
                </strong>

                <div>
                  The system will show the adjustment before
                  you save it.
                </div>
              </div>
            ) : (
              <div>
                <strong>
                  {adjustmentTone.label}:{' '}
                  {difference >= 0 ? '+' : ''}
                  {difference} unit
                  {Math.abs(difference) === 1
                    ? ''
                    : 's'}
                </strong>

                <div>
                  Batch quantity:{' '}
                  {currentBatchQuantity} →{' '}
                  {parsedActualQuantity}
                </div>

                <div>
                  Product stock:{' '}
                  {currentProductStock} →{' '}
                  {resultingProductStock}
                </div>
              </div>
            )}
          </div>

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
              disabled={
                busy ||
                !hasEnteredQuantity ||
                !notes.trim()
              }
            >
              {busy
                ? 'Saving adjustment...'
                : 'Save adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}