import {
  useEffect,
  useState
} from 'react';

import {
  Link
} from 'react-router-dom';

import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';

import {
  discardProductDraft,
  listProductDrafts
} from '../services/productOutbox';

import {
  getErrorMessage
} from '../utils/errors';

export default function PendingProductsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [discardingId, setDiscardingId] = useState(null);

  async function load() {
    try {
      setError('');

      setDrafts(
        await listProductDrafts()
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load locally saved product drafts.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    window.addEventListener(
      'essential-product-outbox-changed',
      load
    );

    return () => {
      window.removeEventListener(
        'essential-product-outbox-changed',
        load
      );
    };
  }, []);

  async function discard(draft) {
    if (discardingId) {
      return;
    }

    const approved = window.confirm(
      `Discard the locally saved draft for "${draft.payload.name}"? ` +
      'This cannot be undone.'
    );

    if (!approved) {
      return;
    }

    setDiscardingId(draft.id);

    try {
      await discardProductDraft(draft.id);
      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to discard draft.'
        )
      );
    } finally {
      setDiscardingId(null);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            LOCAL DRAFTS
          </p>

          <h1>
            Pending Products
          </h1>

          <p>
            Product changes saved on this device.
            These have not been sent to the server.
          </p>
        </div>

        <Link
          className="secondary-btn"
          to="/products"
        >
          Back to products
        </Link>
      </div>

      <div className="inventory-cache-notice">
        Automatic synchronization is not enabled yet.
        Keep these drafts until server synchronization
        support is installed. Clearing browser site data
        can delete these drafts and their photos.
      </div>

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <GlassCard className="table-card">
        {loading ? (
          <div className="page-loading">
            Loading local drafts...
          </div>
        ) : drafts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Action</th>
                  <th>Saved</th>
                  <th>Photo</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {drafts.map(draft => (
                  <tr key={draft.id}>
                    <td>
                      {draft.payload.name}
                    </td>

                    <td>
                      {draft.kind === 'create'
                        ? 'New product'
                        : 'Product edit'}
                    </td>

                    <td>
                      {new Date(
                        draft.createdAt
                      ).toLocaleString()}
                    </td>

                    <td>
                      {draft.imageBlob
                        ? 'Saved locally'
                        : 'No new photo'}
                    </td>

                    <td>
                      Saved on this device only
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={Boolean(discardingId)}
                        onClick={() => discard(draft)}
                      >
                        {discardingId === draft.id
                          ? 'Discarding...'
                          : 'Discard draft'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No pending product drafts"
            description="Offline product saves will appear here."
          />
        )}
      </GlassCard>
    </div>
  );
}