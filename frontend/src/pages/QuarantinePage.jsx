import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Package,
  RefreshCw,
  Trash2
} from 'lucide-react';
import client from '../api/client';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import GlassCard from '../components/common/GlassCard';
import { getErrorMessage } from '../utils/errors';
import { dateOnly } from '../utils/format';

export default function QuarantinePage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending_inspection');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
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
      setError(getErrorMessage(err, 'Unable to load quarantine items.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [status]);

  function openAction(item, type) {
    setConfirm({ item, type });
  }

  async function processAction() {
    if (!confirm) return;

    const { item, type } = confirm;

    const endpoint =
      type === 'dispose'
        ? `/quarantine/${item._id}/dispose`
        : type === 'supplier'
        ? `/quarantine/${item._id}/returnToSupplier`
        : `/quarantine/${item._id}/release`;

    setActionLoading(true);
    setError('');

    try {
      if (type === 'release') {
        setError(
          'Release-to-stock requires a batch selection. Add a batch selector before using this action.'
        );
        return;
      }

      await client.patch(endpoint, {
        notes: 'Processed from the Quarantine page'
      });

      setConfirm(null);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update the quarantine item.'));
    } finally {
      setActionLoading(false);
    }
  }

  const actionTitle =
    confirm?.type === 'dispose'
      ? 'Dispose quarantine item'
      : confirm?.type === 'supplier'
      ? 'Return item to supplier'
      : 'Release item to stock';

  const actionDescription =
    confirm?.type === 'dispose'
      ? `Dispose ${confirm?.item?.quantity || 0} unit(s) of ${
          confirm?.item?.name || 'this item'
        }? This cannot be undone.`
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
            Inspect returned products before disposal, supplier return, or release.
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

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="table-card">
        <div className="filter-panel">
          <select
            value={status}
            onChange={event => setStatus(event.target.value)}
          >
            <option value="pending_inspection">Pending inspection</option>
            <option value="disposed">Disposed</option>
            <option value="returned_to_supplier">Returned to supplier</option>
            <option value="released_to_stock">Released to stock</option>
          </select>
        </div>

        {loading ? (
          <div className="page-loading">Loading quarantine items...</div>
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
                      <strong>{item.product?.name || item.name}</strong>
                      <small className="table-subtext">
                        {item.barcode || item.product?.barcode || '—'}
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
                            title="Dispose"
                            onClick={() => openAction(item, 'dispose')}
                          >
                            <Trash2 size={15} />
                          </button>

                          <button
                            type="button"
                            className="row-icon"
                            title="Return to supplier"
                            onClick={() => openAction(item, 'supplier')}
                          >
                            <Package size={15} />
                          </button>

                          <button
                            type="button"
                            className="row-icon"
                            title="Release to stock"
                            onClick={() => openAction(item, 'release')}
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
            description="No items match the selected quarantine status."
          />
        )}
      </GlassCard>

      {confirm && (
        <ConfirmDialog
          title={actionTitle}
          description={actionDescription}
          confirmText={
            confirm.type === 'dispose'
              ? 'Dispose'
              : confirm.type === 'supplier'
              ? 'Return to supplier'
              : 'Release'
          }
          loading={actionLoading}
          onCancel={() => {
            if (!actionLoading) setConfirm(null);
          }}
          onConfirm={processAction}
        />
      )}
    </div>
  );
}