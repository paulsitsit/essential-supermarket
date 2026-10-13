import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Link
} from 'react-router-dom';

import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Trash2
} from 'lucide-react';

import {
  clearCompletedStockReceipts,
  getPendingStockReceipts,
  removeStockReceiptDraft,
  subscribeToStockOutbox,
  syncPendingStockReceipts
} from '../services/stockOutbox.js';

import {
  useOnlineStatus
} from '../hooks/useOnlineStatus.js';

const statusLabels = {
  pending: 'Waiting to sync',
  syncing: 'Synchronizing',
  retryable: 'Ready to retry',
  synced: 'Synced',
  failed: 'Needs attention',
  conflict: 'Server conflict',
  discarded: 'Discarded'
};

const statusClasses = {
  pending: 'status-warning',
  syncing: 'status-normal',
  retryable: 'status-warning',
  synced: 'status-normal',
  failed: 'status-critical',
  conflict: 'status-critical',
  discarded: 'status-normal'
};

function isValidReceiptDraft(draft) {
  return Boolean(
    draft &&
      typeof draft === 'object' &&
      draft.id &&
      draft.product &&
      draft.receipt
  );
}

function normalizeDrafts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    isValidReceiptDraft
  );
}

function formatDate(value) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

function formatReceiptDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function PendingStockReceiptsPage() {
  const isOnline = useOnlineStatus();

  const [drafts, setDrafts] = useState(() =>
    normalizeDrafts(
      getPendingStockReceipts()
    )
  );

  const [syncing, setSyncing] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  useEffect(() => {
    const unsubscribe =
      subscribeToStockOutbox(nextDrafts => {
        setDrafts(
          normalizeDrafts(nextDrafts)
        );
      });

    return unsubscribe;
  }, []);

  const syncableDrafts = useMemo(
    () =>
      drafts.filter(
        draft =>
          draft.status === 'pending' ||
          draft.status === 'retryable'
      ),
    [drafts]
  );

  const completedDrafts = useMemo(
    () =>
      drafts.filter(
        draft =>
          draft.status === 'synced' ||
          draft.status === 'discarded'
      ),
    [drafts]
  );

  async function handleSyncNow() {
    if (
      !isOnline ||
      syncing ||
      syncableDrafts.length === 0
    ) {
      return;
    }

    setSyncing(true);
    setError('');
    setMessage('');

    try {
      const result =
        await syncPendingStockReceipts();

      const parts = [];

      if (result.synced > 0) {
        parts.push(
          `${result.synced} stock receipt${
            result.synced === 1 ? '' : 's'
          } synchronized.`
        );
      }

      if (result.conflicts > 0) {
        parts.push(
          `${result.conflicts} receipt${
            result.conflicts === 1 ? '' : 's'
          } needs review before it can be synchronized.`
        );
      }

      if (result.failed > 0) {
        parts.push(
          `${result.failed} receipt${
            result.failed === 1 ? '' : 's'
          } could not be synchronized.`
        );
      }

      setMessage(
        parts.join(' ') ||
          'No stock receipts were ready to synchronize.'
      );
    } catch (syncError) {
      console.error(
        'Unable to synchronize stock receipts:',
        syncError
      );

      setError(
        syncError?.message ||
          'Unable to synchronize stock receipts.'
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleDiscard(draft) {
    if (!draft?.id) {
      return;
    }

    const productName =
      draft.product?.name ||
      'this product';

    const confirmed = window.confirm(
      `Discard the pending stock receipt for "${productName}"? This will not change server stock.`
    );

    if (!confirmed) {
      return;
    }

    removeStockReceiptDraft(draft.id);

    setMessage(
      'Pending stock receipt discarded.'
    );
  }

  function handleClearCompleted() {
    if (completedDrafts.length === 0) {
      setMessage(
        'There are no completed stock receipts to clear.'
      );

      return;
    }

    const confirmed = window.confirm(
      `Clear ${completedDrafts.length} completed stock receipt${
        completedDrafts.length === 1 ? '' : 's'
      }?`
    );

    if (!confirmed) {
      return;
    }

    clearCompletedStockReceipts();

    setMessage(
      'Completed stock receipts were cleared.'
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Offline synchronization
          </p>

          <h1>
            Pending Stock Receipts
          </h1>

          <p>
            Stock receipts saved while offline
            remain on this device until the server
            safely creates their batches and stock
            movements.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleClearCompleted}
            disabled={
              syncing ||
              completedDrafts.length === 0
            }
          >
            <Trash2 size={16} />
            Clear completed
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={handleSyncNow}
            disabled={
              !isOnline ||
              syncing ||
              syncableDrafts.length === 0
            }
          >
            <RefreshCw
              size={16}
              className={
                syncing
                  ? 'button-spinner'
                  : ''
              }
            />

            {syncing
              ? 'Syncing...'
              : syncableDrafts.length === 0
                ? 'All synced'
                : 'Sync now'}
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="form-error">
          <CloudOff size={16} />

          <span>
            You are offline. Pending stock receipts
            remain only on this device until the
            connection returns.
          </span>
        </div>
      )}

      {message && (
        <div className="scan-success-message">
          <CheckCircle2 size={17} />

          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="form-error">
          <AlertTriangle size={16} />

          <span>{error}</span>
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="glass-card large-empty">
          <CheckCircle2 size={30} />

          <strong>
            No pending stock receipts
          </strong>

          <span>
            Stock receipts saved while offline will
            appear here.
          </span>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Batch / Lot</th>
                  <th>Received</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Saved</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {drafts.map(draft => {
                  const product =
                    draft.product || {};

                  const receipt =
                    draft.receipt || {};

                  const status =
                    draft.status || 'pending';

                  return (
                    <tr key={draft.id}>
                      <td>
                        <div className="table-product">
                          <div className="product-avatar">
                            {String(
                              product.name || 'S'
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="table-product-info">
                            <strong>
                              {product.name ||
                                'Unknown product'}
                            </strong>

                            <small>
                              {product.barcode ||
                                product.sku ||
                                'No barcode or SKU'}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {receipt.quantity || 0}
                        </strong>{' '}

                        <small>
                          {product.unitType ||
                            'units'}
                        </small>
                      </td>

                      <td>
                        <span className="mono-text">
                          {receipt.batchNumber ||
                            '—'}
                        </span>
                      </td>

                      <td>
                        {formatReceiptDate(
                          receipt.receivedDate
                        )}
                      </td>

                      <td>
                        {formatReceiptDate(
                          receipt.expirationDate
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            statusClasses[status] ||
                            'status-normal'
                          }`}
                        >
                          {statusLabels[status] ||
                            'Waiting to sync'}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          draft.createdAt
                        )}
                      </td>

                      <td>
                        <small className="table-subtext">
                          {draft.errorMessage ||
                            (status === 'synced'
                              ? 'Batch and stock movement were created on the server.'
                              : receipt.reason ||
                                'Stock receipt waiting to synchronize.')}
                        </small>
                      </td>

                      <td>
                        <div className="row-actions">
                          {status !== 'synced' &&
                            status !==
                              'discarded' && (
                              <button
                                type="button"
                                className="row-icon danger-icon"
                                onClick={() =>
                                  handleDiscard(
                                    draft
                                  )
                                }
                                disabled={syncing}
                                title="Discard receipt"
                                aria-label="Discard receipt"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className="settings-info"
        style={{ marginTop: 18 }}
      >
        <CheckCircle2 size={16} />

        <span>
          Offline receipts do not change shared
          inventory immediately. Stock changes only
          after the server creates the batch and
          records the stock movement.
        </span>
      </div>

      <div style={{ marginTop: 18 }}>
        <Link
          to="/products"
          className="secondary-btn"
        >
          Back to products
        </Link>
      </div>
    </div>
  );
}