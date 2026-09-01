import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Package,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import client from '../api/client';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import GlassCard from '../components/common/GlassCard';
import { getErrorMessage } from '../utils/errors';
import { dateOnly } from '../utils/format';

function batchLabel(batch) {
  const expiry = batch.expirationDate
    ? dateOnly(batch.expirationDate)
    : 'No expiry';

  return `${batch.batchNumber || 'Unnamed batch'} — Available: ${
    batch.quantity
  } — Expiry: ${expiry}`;
}

export default function QuarantinePage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending_inspection');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [actionModal, setActionModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [confirm, setConfirm] = useState(null);

  async function loadItems() {
    setLoading(true);
    setError('');

    try {
      const response = await client.get(
        `/quarantine?status=${encodeURIComponent(status)}`
      );

      setItems(response.data.items || []);
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to load quarantine items.')
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [status]);

  function closeActionModal() {
    if (actionLoading) return;

    setActionModal(null);
    setNotes('');
    setBatches([]);
    setSelectedBatchId('');
  }

  async function openActionModal(item, type) {
    setError('');
    setNotes('');
    setSelectedBatchId('');
    setBatches([]);

    setActionModal({
      item,
      type
    });

    if (type !== 'release') return;

    setLoadingBatches(true);

    try {
      const productId = item.product?._id || item.product;

      const response = await client.get(
        `/batches/product/${productId}`
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const validBatches = (response.data.batches || []).filter(batch => {
        if (!batch.expirationDate) return true;

        const expiry = new Date(batch.expirationDate);
        expiry.setHours(0, 0, 0, 0);

        return expiry >= today;
      });

      setBatches(validBatches);
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to load product batches.')
      );
    } finally {
      setLoadingBatches(false);
    }
  }

  function prepareAction() {
    if (!actionModal) return;

    const { item, type } = actionModal;

    if (type === 'release' && !selectedBatchId) {
      setError(
        'Select a valid product batch before releasing this item.'
      );
      return;
    }

    setConfirm({
      item,
      type,
      notes,
      batchId: selectedBatchId
    });
  }

  async function processAction() {
    if (!confirm) return;

    const {
      item,
      type,
      notes: actionNotes,
      batchId
    } = confirm;

    const endpoint =
      type === 'dispose'
        ? `/quarantine/${item._id}/dispose`
        : type === 'supplier'
        ? `/quarantine/${item._id}/returnToSupplier`
        : `/quarantine/${item._id}/release`;

    setActionLoading(true);
    setError('');

    try {
      const payload =
        type === 'release'
          ? {
              notes: actionNotes.trim(),
              batchId
            }
          : {
              notes: actionNotes.trim()
            };

      await client.patch(endpoint, payload);

      setConfirm(null);
      setActionModal(null);
      setNotes('');
      setBatches([]);
      setSelectedBatchId('');

      await loadItems();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to update quarantine item.'
        )
      );
    } finally {
      setActionLoading(false);
    }
  }

  const actionTitle =
    actionModal?.type === 'dispose'
      ? 'Dispose quarantine item'
      : actionModal?.type === 'supplier'
      ? 'Return item to supplier'
      : 'Release item to sellable stock';

  const actionDescription =
    actionModal?.type === 'dispose'
      ? 'This marks the item as disposed. Product sellable stock will not change.'
      : actionModal?.type === 'supplier'
      ? 'This marks the item as returned to its supplier. Product sellable stock will not change.'
      : 'Choose the valid product batch that will receive this item back into sellable inventory.';

  const confirmTitle =
    confirm?.type === 'dispose'
      ? 'Confirm disposal'
      : confirm?.type === 'supplier'
      ? 'Confirm supplier return'
      : 'Confirm release to stock';

  const confirmDescription =
    confirm?.type === 'dispose'
      ? `Dispose ${confirm?.item?.quantity || 0} unit(s) of ${
          confirm?.item?.name || 'this item'
        }?`
      : confirm?.type === 'supplier'
      ? `Mark ${confirm?.item?.quantity || 0} unit(s) of ${
          confirm?.item?.name || 'this item'
        } as returned to the supplier?`
      : `Release ${confirm?.item?.quantity || 0} unit(s) of ${
          confirm?.item?.name || 'this item'
        } to sellable stock?`;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUARANTINE</p>
          <h1>Quarantine items</h1>
          <p>
            Inspect returned products before disposal, supplier
            return, or release to stock.
          </p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={loadItems}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <GlassCard className="table-card">
        <div className="filter-panel">
          <select
            value={status}
            onChange={event => setStatus(event.target.value)}
            disabled={loading}
          >
            <option value="pending_inspection">
              Pending inspection
            </option>
            <option value="disposed">Disposed</option>
            <option value="returned_to_supplier">
              Returned to supplier
            </option>
            <option value="released_to_stock">
              Released to stock
            </option>
          </select>
        </div>

        {loading ? (
          <div className="page-loading">
            Loading quarantine items...
          </div>
        ) : items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                  <th>Reason</th>
                  <th>Date received</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td>
                      <strong>
                        {item.product?.name || item.name}
                      </strong>

                      <small className="table-subtext">
                        {item.barcode ||
                          item.product?.barcode ||
                          '—'}
                      </small>
                    </td>

                    <td>
                      <strong>{item.quantity}</strong>
                    </td>

                    <td>
                      <span className="movement-pill movement-damaged">
                        {item.condition}
                      </span>
                    </td>

                    <td>{item.reason || '—'}</td>

                    <td>{dateOnly(item.createdAt)}</td>

                    <td>
                      <span className="movement-pill">
                        {item.status.replaceAll('_', ' ')}
                      </span>
                    </td>

                    <td>
                      {item.status === 'pending_inspection' ? (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="row-icon danger-icon"
                            title="Dispose item"
                            onClick={() =>
                              openActionModal(item, 'dispose')
                            }
                          >
                            <Trash2 size={15} />
                          </button>

                          <button
                            type="button"
                            className="row-icon"
                            title="Return item to supplier"
                            onClick={() =>
                              openActionModal(item, 'supplier')
                            }
                          >
                            <Package size={15} />
                          </button>

                          <button
                            type="button"
                            className="row-icon"
                            title="Release item to sellable stock"
                            onClick={() =>
                              openActionModal(item, 'release')
                            }
                          >
                            <CheckCircle size={15} />
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No quarantine items"
            description="No quarantine items match the selected status."
          />
        )}
      </GlassCard>

      {actionModal && (
        <div className="modal-backdrop">
          <div className="modal-card compact-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">QUARANTINE ACTION</p>
                <h3>{actionTitle}</h3>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={closeActionModal}
                disabled={actionLoading}
                aria-label="Close action modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="stock-summary">
              <div>
                <span>Product</span>
                <strong>
                  {actionModal.item.product?.name ||
                    actionModal.item.name}
                </strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>{actionModal.item.quantity}</strong>
              </div>

              <div>
                <span>Condition</span>
                <strong>{actionModal.item.condition}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {actionModal.item.status.replaceAll('_', ' ')}
                </strong>
              </div>
            </div>

            <p>{actionDescription}</p>

            {actionModal.type === 'release' && (
              <div className="modal-form">
                <label>
                  <span>Select receiving batch *</span>

                  {loadingBatches ? (
                    <div className="page-loading">
                      Loading valid batches...
                    </div>
                  ) : (
                    <select
                      value={selectedBatchId}
                      onChange={event =>
                        setSelectedBatchId(event.target.value)
                      }
                      disabled={
                        actionLoading || !batches.length
                      }
                    >
                      <option value="">
                        {batches.length
                          ? 'Choose a valid non-expired batch'
                          : 'No valid batches available'}
                      </option>

                      {batches.map(batch => (
                        <option key={batch._id} value={batch._id}>
                          {batchLabel(batch)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                {!loadingBatches && !batches.length && (
                  <div className="form-error">
                    No active non-expired batch exists for this
                    product. Create or receive a valid batch before
                    releasing this item to stock.
                  </div>
                )}
              </div>
            )}

            <div className="modal-form" style={{ marginTop: 14 }}>
              <label>
                <span>
                  {actionModal.type === 'supplier'
                    ? 'Supplier return reference / notes'
                    : 'Notes'}
                </span>

                <textarea
                  rows="3"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  disabled={actionLoading}
                  placeholder={
                    actionModal.type === 'dispose'
                      ? 'Example: Product disposed according to store policy'
                      : actionModal.type === 'supplier'
                      ? 'Example: Supplier return reference #SR-001'
                      : 'Example: Packaging inspected and approved for resale'
                  }
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeActionModal}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  actionModal.type === 'dispose'
                    ? 'danger-btn'
                    : 'primary-btn'
                }
                onClick={prepareAction}
                disabled={
                  actionLoading ||
                  loadingBatches ||
                  (actionModal.type === 'release' &&
                    (!selectedBatchId || !batches.length))
                }
              >
                {actionModal.type === 'dispose'
                  ? 'Continue disposal'
                  : actionModal.type === 'supplier'
                  ? 'Continue supplier return'
                  : 'Continue release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirmTitle}
          description={confirmDescription}
          confirmText={
            confirm.type === 'dispose'
              ? 'Dispose'
              : confirm.type === 'supplier'
              ? 'Return to supplier'
              : 'Release to stock'
          }
          loading={actionLoading}
          onCancel={() => {
            if (!actionLoading) {
              setConfirm(null);
            }
          }}
          onConfirm={processAction}
        />
      )}
    </div>
  );
}