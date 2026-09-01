import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Package,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import client from '../api/client';
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

function actionTitle(type) {
  if (type === 'dispose') return 'Dispose quarantine item';
  if (type === 'supplier') return 'Return item to supplier';
  return 'Release item to sellable stock';
}

function actionButtonLabel(type, loading) {
  if (loading) return 'Processing...';
  if (type === 'dispose') return 'Dispose item';
  if (type === 'supplier') return 'Return to supplier';
  return 'Release to stock';
}

export default function QuarantinePage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending_inspection');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

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

  function resetActionState() {
    setActionModal(null);
    setNotes('');
    setBatches([]);
    setSelectedBatchId('');
    setLoadingBatches(false);
  }

  function closeActionModal() {
    if (actionLoading) return;
    resetActionState();
  }

  async function openActionModal(item, type) {
    setError('');
    setNotes('');
    setBatches([]);
    setSelectedBatchId('');

    setActionModal({ item, type });

    if (type !== 'release') return;

    const productId = item.product?._id || item.product;

    if (!productId) {
      setError('This quarantine item has no linked product.');
      return;
    }

    setLoadingBatches(true);

    try {
      const response = await client.get(
        `/batches/product/${productId}`
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const validBatches = (response.data.batches || []).filter(batch => {
        if (!batch.expirationDate) return true;

        const expiration = new Date(batch.expirationDate);
        expiration.setHours(0, 0, 0, 0);

        return expiration >= today;
      });

      setBatches(validBatches);

      if (validBatches.length === 1) {
        setSelectedBatchId(validBatches[0]._id);
      }
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to load batches for this product.')
      );
    } finally {
      setLoadingBatches(false);
    }
  }

  async function submitAction(event) {
    event.preventDefault();

    if (!actionModal || actionLoading) return;

    const { item, type } = actionModal;

    if (type === 'release' && !selectedBatchId) {
      setError('Select a valid product batch before releasing stock.');
      return;
    }

    const endpoint =
      type === 'dispose'
        ? `/quarantine/${item._id}/dispose`
        : type === 'supplier'
        ? `/quarantine/${item._id}/returnToSupplier`
        : `/quarantine/${item._id}/release`;

    const payload =
      type === 'release'
        ? {
            batchId: selectedBatchId,
            notes: notes.trim()
          }
        : {
            notes: notes.trim()
          };

    setActionLoading(true);
    setError('');

    try {
      await client.patch(endpoint, payload);

      resetActionState();

      await loadItems();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to update the quarantine item. Please try again.'
        )
      );
    } finally {
      setActionLoading(false);
    }
  }

  const selectedItem = actionModal?.item;
  const selectedType = actionModal?.type;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUARANTINE</p>
          <h1>Quarantine items</h1>
          <p>
            Inspect returned products before disposal, supplier
            return, or release to sellable stock.
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
                        {String(item.status || '').replaceAll('_', ' ')}
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
          <form
            className="modal-card compact-modal"
            onSubmit={submitAction}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">QUARANTINE ACTION</p>
                <h3>{actionTitle(selectedType)}</h3>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={closeActionModal}
                disabled={actionLoading}
                aria-label="Close quarantine action"
              >
                <X size={20} />
              </button>
            </div>

            <div className="stock-summary">
              <div>
                <span>Product</span>
                <strong>
                  {selectedItem.product?.name || selectedItem.name}
                </strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>{selectedItem.quantity}</strong>
              </div>

              <div>
                <span>Condition</span>
                <strong>{selectedItem.condition}</strong>
              </div>

              <div>
                <span>Current status</span>
                <strong>
                  {String(selectedItem.status || '').replaceAll(
                    '_',
                    ' '
                  )}
                </strong>
              </div>
            </div>

            {selectedType === 'dispose' && (
              <p>
                This will mark the item as disposed. It does not
                increase sellable inventory.
              </p>
            )}

            {selectedType === 'supplier' && (
              <p>
                This will mark the item as returned to the supplier.
                It does not increase sellable inventory.
              </p>
            )}

            {selectedType === 'release' && (
              <p>
                Choose a valid, non-expired batch before placing this
                item back into sellable inventory.
              </p>
            )}

            {selectedType === 'release' && (
              <div className="modal-form">
                <label>
                  <span>Receiving batch *</span>

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
                        actionLoading || batches.length === 0
                      }
                      required
                    >
                      <option value="">
                        {batches.length
                          ? 'Choose a valid non-expired batch'
                          : 'No valid batch available'}
                      </option>

                      {batches.map(batch => (
                        <option key={batch._id} value={batch._id}>
                          {batchLabel(batch)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                {!loadingBatches && batches.length === 0 && (
                  <div className="form-error">
                    No active, non-expired batch is available for this
                    product. Create or receive a batch before releasing
                    stock.
                  </div>
                )}
              </div>
            )}

            <div className="modal-form" style={{ marginTop: 14 }}>
              <label>
                <span>
                  {selectedType === 'supplier'
                    ? 'Supplier return reference / notes'
                    : 'Notes'}
                </span>

                <textarea
                  rows="3"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  disabled={actionLoading}
                  placeholder={
                    selectedType === 'dispose'
                      ? 'Example: Product disposed according to store policy'
                      : selectedType === 'supplier'
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
                type="submit"
                className={
                  selectedType === 'dispose'
                    ? 'danger-btn'
                    : 'primary-btn'
                }
                disabled={
                  actionLoading ||
                  loadingBatches ||
                  (selectedType === 'release' &&
                    (!selectedBatchId || batches.length === 0))
                }
              >
                {actionButtonLabel(
                  selectedType,
                  actionLoading
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}