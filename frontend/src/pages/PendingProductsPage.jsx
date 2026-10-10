import {
  useEffect,
  useMemo,
  useState
} from 'react';

import { Link } from 'react-router-dom';

import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Trash2
} from 'lucide-react';

import {
  clearCompletedProductDrafts,
  getPendingProductDrafts,
  removeProductDraft,
  subscribeToProductOutbox,
  syncPendingProductDrafts
} from '../services/productOutbox.js';

import {
  useOnlineStatus
} from '../hooks/useOnlineStatus.js';

const statusLabels = {
  pending: 'Waiting to sync',
  syncing: 'Syncing',
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

function isValidDraft(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      value.id &&
      value.kind &&
      value.draft &&
      typeof value.draft === 'object'
  );
}

function normalizeDrafts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isValidDraft);
}

function formatDate(value) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

function getDraftName(draft) {
  return (
    String(draft?.draft?.name || '').trim() ||
    'Unnamed product'
  );
}

function getDraftCode(draft) {
  return (
    String(draft?.draft?.barcode || '').trim() ||
    String(draft?.draft?.sku || '').trim() ||
    'No barcode or SKU'
  );
}

export default function PendingProductsPage() {
  const isOnline = useOnlineStatus();

  const [drafts, setDrafts] = useState(() =>
    normalizeDrafts(getPendingProductDrafts())
  );

  const [syncing, setSyncing] = useState(false);

  const [message, setMessage] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe =
      subscribeToProductOutbox(nextDrafts => {
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
    setMessage('');
    setError('');

    try {
      const result =
        await syncPendingProductDrafts();

      const parts = [];

      if (result.synced > 0) {
        parts.push(
          `${result.synced} product draft${
            result.synced === 1 ? '' : 's'
          } synchronized.`
        );
      }

      if (result.conflicts > 0) {
        parts.push(
          `${result.conflicts} draft${
            result.conflicts === 1 ? '' : 's'
          } needs review because the server version changed.`
        );
      }

      if (result.failed > 0) {
        parts.push(
          `${result.failed} draft${
            result.failed === 1 ? '' : 's'
          } could not be synchronized.`
        );
      }

      setMessage(
        parts.join(' ') ||
          'No product drafts were ready to synchronize.'
      );
    } catch (syncError) {
      console.error(
        'Unable to synchronize product drafts:',
        syncError
      );

      setError(
        syncError?.message ||
          'Unable to synchronize product drafts.'
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleDiscard(draft) {
    if (!draft?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Discard the offline draft for "${getDraftName(
        draft
      )}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    removeProductDraft(draft.id);

    setMessage(
      'Offline product draft discarded.'
    );
  }

  function handleClearCompleted() {
    if (completedDrafts.length === 0) {
      setMessage(
        'There are no completed product drafts to clear.'
      );

      return;
    }

    const confirmed = window.confirm(
      `Clear ${completedDrafts.length} completed draft${
        completedDrafts.length === 1 ? '' : 's'
      }?`
    );

    if (!confirmed) {
      return;
    }

    clearCompletedProductDrafts();

    setMessage(
      'Completed product drafts were cleared.'
    );
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Offline synchronization
          </p>

          <h1>Pending Products</h1>

          <p>
            Products saved while offline stay on
            this device until they can be safely
            synchronized with the server.
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
              : 'Sync now'}
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="form-error">
          <CloudOff size={16} />

          <span>
            You are offline. Drafts remain on this
            device until the connection returns.
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
            No pending product drafts
          </strong>

          <span>
            Products saved while offline will
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
                  <th>Type</th>
                  <th>Status</th>
                  <th>Saved</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {drafts.map(draft => {
                  const name =
                    getDraftName(draft);

                  const code =
                    getDraftCode(draft);

                  const status =
                    draft.status || 'pending';

                  return (
                    <tr key={draft.id}>
                      <td>
                        <div className="table-product">
                          <div className="product-avatar">
                            {name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="table-product-info">
                            <strong>{name}</strong>

                            <small>{code}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {draft.kind === 'update'
                          ? 'Product edit'
                          : 'New product'}
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
                            (draft.kind === 'update'
                              ? 'Will apply the saved edit to the product.'
                              : 'Will create a new product with zero stock.')}
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
                                title="Discard draft"
                                aria-label="Discard draft"
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

      <div className="settings-info">
        <CheckCircle2 size={16} />

        <span>
          Offline product creations always begin
          at zero stock. Use Receive Stock after
          synchronization to create the first
          sellable batch.
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