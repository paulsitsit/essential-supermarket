import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ImageOff,
  Package,
  PackageCheck,
  PackageX,
  RefreshCw,
  RotateCcw,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';

import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import './ArchivedProductsPage.css';
import './ArchivedProductsPage.theme-fix.css';

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0);
}

function getStockStatus(product) {
  const stock = Number(product.currentStock || 0);
  const reorderLevel = Number(product.reorderLevel ?? 10);

  if (stock <= 0) return { label: 'Out of stock', tone: 'out' };
  if (stock <= reorderLevel) return { label: 'Low stock', tone: 'low' };
  return { label: 'In stock', tone: 'normal' };
}

function ProductThumbnail({ product }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = typeof product.imageUrl === 'string'
    ? product.imageUrl.trim()
    : '';
  // Do not render inline Base64 images in the archive table. The backend
  // deliberately removes them from list responses to keep requests light.
  const canShowImage = imageUrl &&
    !imageUrl.startsWith('data:image/') &&
    !failed;

  if (canShowImage) {
    return (
      <img
        className="archive-product-image"
        src={imageUrl}
        alt={product.name ? `${product.name} product` : 'Product'}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="archive-product-icon" aria-label="Product image unavailable">
      {imageUrl && failed ? <ImageOff size={21} /> : <Package size={22} />}
    </div>
  );
}

export default function ArchivedProductsPage() {
  const { account } = useAuth();
  const isAdmin = String(account?.role || '').toLowerCase() === 'admin';

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringId, setRestoringId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load({ refresh = false } = {}) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await client.get('/products/archived');
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load archived products.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter(product => {
      const status = getStockStatus(product);
      const searchable = [
        product.name,
        product.sku,
        product.barcode,
        product.brand,
        product.category?.name,
        product.supplier?.name
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'in-stock' && status.tone === 'normal') ||
        (stockFilter === 'low-stock' && status.tone === 'low') ||
        (stockFilter === 'out-of-stock' && status.tone === 'out');

      return matchesSearch && matchesStock;
    });
  }, [products, search, stockFilter]);

  const inStockCount = products.filter(product => Number(product.currentStock || 0) > 0).length;
  const outOfStockCount = products.filter(product => Number(product.currentStock || 0) <= 0).length;
  const lowStockCount = products.filter(product => getStockStatus(product).tone === 'low').length;

  async function restoreProduct(product) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Restore "${product.name}" to the active product catalog?`
    );
    if (!confirmed) return;

    const id = product._id || product.id;
    if (!id) {
      setError('This archived product has no valid server ID.');
      return;
    }

    setRestoringId(String(id));
    setError('');
    setNotice('');

    try {
      const response = await client.patch(`/products/${id}/restore`);
      setProducts(current => current.filter(item =>
        String(item._id || item.id) !== String(id)
      ));
      setNotice(response.data?.message || `${product.name} was restored.`);
    } catch (err) {
      setError(getErrorMessage(err, `Unable to restore ${product.name}.`));
    } finally {
      setRestoringId('');
    }
  }

  return (
    <div className="archived-products-page">
      <div className="page-heading archive-page-heading">
        <div>
          <p className="eyebrow">CATALOG MANAGEMENT</p>
          <h1>Archived Products</h1>
          <p>Review products removed from the active catalog and restore them when needed.</p>
        </div>
        <div className="archive-heading-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => load({ refresh: true })}
            disabled={refreshing || loading}
          >
            <RefreshCw size={16} className={refreshing ? 'archive-spinning' : ''} />
            Refresh
          </button>
          <Link to="/products" className="secondary-btn">
            <ArrowLeft size={16} />
            Active products
          </Link>
        </div>
      </div>

      {error && <div className="form-error page-message" role="alert">{error}</div>}
      {notice && <div className="archive-notice" role="status">{notice}</div>}

      <div className="archive-summary-grid">
        <GlassCard className="archive-summary-card">
          <div className="archive-summary-icon archive-tone-purple"><Archive size={22} /></div>
          <div>
            <span>Archived products</span>
            <strong>{products.length.toLocaleString('en-PH')}</strong>
            <small>Removed from active catalog</small>
          </div>
        </GlassCard>
        <GlassCard className="archive-summary-card">
          <div className="archive-summary-icon archive-tone-green"><PackageCheck size={22} /></div>
          <div>
            <span>With stock remaining</span>
            <strong>{inStockCount.toLocaleString('en-PH')}</strong>
            <small>Stock is preserved while archived</small>
          </div>
        </GlassCard>
        <GlassCard className="archive-summary-card">
          <div className="archive-summary-icon archive-tone-red"><PackageX size={22} /></div>
          <div>
            <span>Out of stock</span>
            <strong>{outOfStockCount.toLocaleString('en-PH')}</strong>
            <small>No units currently available</small>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="archive-list-card">
        <div className="archive-list-heading">
          <div>
            <h2><Archive size={19} /> Archive register</h2>
            <p>{filteredProducts.length.toLocaleString('en-PH')} of {products.length.toLocaleString('en-PH')} archived products</p>
          </div>
        </div>

        <div className="archive-toolbar">
          <label className="archive-search">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search product, SKU, barcode, category, supplier..."
              aria-label="Search archived products"
            />
          </label>
          <label className="archive-stock-filter">
            <span>Stock status</span>
            <select value={stockFilter} onChange={event => setStockFilter(event.target.value)}>
              <option value="all">All stock statuses</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="page-loading">Loading archived products...</div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title={products.length ? 'No matching archived products' : 'Archive is empty'}
            description={products.length
              ? 'Try another search term or stock-status filter.'
              : 'When a product is archived from the Products page, it will appear here. Archived products are preserved and can be restored.'}
          />
        ) : (
          <div className="archive-table-wrap">
            <table className="data-table archive-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode / SKU</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Cost price</th>
                  <th>Supplier</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const status = getStockStatus(product);
                  const id = String(product._id || product.id || product.sku);
                  return (
                    <tr key={id}>
                      <td>
                        <div className="archive-product-cell">
                          <ProductThumbnail product={product} />
                          <div className="archive-product-text">
                            <strong>{product.name || 'Unnamed product'}</strong>
                            <small>{product.brand || 'No brand recorded'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="archive-code-cell">
                          <strong>{product.barcode || '—'}</strong>
                          <small>{product.sku || 'No SKU'}</small>
                        </div>
                      </td>
                      <td>{product.category?.name || 'Uncategorized'}</td>
                      <td>
                        <div className="archive-stock-cell">
                          <strong>{Number(product.currentStock || 0).toLocaleString('en-PH')} {product.unitType || 'units'}</strong>
                          <span className={`archive-stock-badge ${status.tone}`}>{status.label}</span>
                          <small>Reorder level: {Number(product.reorderLevel ?? 10).toLocaleString('en-PH')}</small>
                        </div>
                      </td>
                      <td>{formatCurrency(product.costPrice)}</td>
                      <td>{product.supplier?.name || '—'}</td>
                      <td>{formatDate(product.updatedAt)}</td>
                      <td>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="archive-restore-btn"
                            onClick={() => restoreProduct(product)}
                            disabled={Boolean(restoringId)}
                            title={`Restore ${product.name || 'product'}`}
                          >
                            <RotateCcw size={15} />
                            {restoringId === String(product._id || product.id) ? 'Restoring...' : 'Restore'}
                          </button>
                        ) : (
                          <span className="archive-admin-note">Admin only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isAdmin && products.length > 0 && (
          <p className="archive-permission-note">You can view archived products. An administrator must restore a product to the active catalog.</p>
        )}
        {lowStockCount > 0 && (
          <p className="archive-permission-note">
            {lowStockCount} archived product{lowStockCount === 1 ? '' : 's'} currently have positive stock at or below the reorder level.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
