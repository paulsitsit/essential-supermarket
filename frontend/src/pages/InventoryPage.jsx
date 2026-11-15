import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ProductFilters from '../components/inventory/ProductFilters';
import ProductTable from '../components/inventory/ProductTable';
import ReceiveStockModal from '../components/inventory/ReceiveStockModal';
import ProductDetailsModal from '../components/inventory/ProductDetailsModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getErrorMessage } from '../utils/errors';
import { cachedGet } from '../services/offlineCache';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function InventoryPage() {
  const { account } = useAuth();
  const { lastEvent } = useSocket();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const actionInFlight = useRef(false);
  const [filters, setFilters] = useState({ search: '', category: '', supplier: '', status: '', sort: 'currentStock', page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isOnline = useOnlineStatus();
  const [cacheInfo, setCacheInfo] = useState(null);
  const readOnly = !isOnline || Boolean(cacheInfo) || loading || saving;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [p, c, s] = await Promise.all([
        cachedGet(`/products?${query}`),
        cachedGet('/categories'),
        cachedGet('/suppliers')
      ]);
      setProducts([...p.data].sort((a, b) => filters.sort === 'updatedAt'
        ? new Date(b.updatedAt) - new Date(a.updatedAt)
        : a.currentStock - b.currentStock));
      setCategories(c.data);
      setSuppliers(s.data);
      setCacheInfo(p.cached ? { savedAt: p.savedAt } : null);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load inventory'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.search, filters.category, filters.supplier, filters.status, filters.sort, lastEvent, isOnline]);

  function receive(product) {
    if (readOnly) {
      setError('Connect and load fresh inventory data before receiving stock.');
      return;
    }
    if (!(product?._id || product?.id)) {
      setError('This product has not synchronized with the server yet.');
      return;
    }
    setDetailsProduct(null);
    setSelected(product);
  }

  function requestAction(product, action) {
    if (account?.role !== 'admin' || readOnly || actionInFlight.current) return;
    if (!(product?._id || product?.id)) {
      setError('This product does not have a valid server ID.');
      return;
    }
    setError('');
    setConfirm({ product, action });
  }

  async function confirmAction() {
    if (actionInFlight.current || !confirm) return;
    if (account?.role !== 'admin' || readOnly) {
      setError('An Admin account and fresh online data are required to change products.');
      setConfirm(null);
      return;
    }
    const { product, action } = confirm;
    const productId = product?._id || product?.id;
    if (!productId || !['archive', 'delete'].includes(action)) {
      setError('Unable to identify the product action.');
      setConfirm(null);
      return;
    }
    actionInFlight.current = true;
    setSaving(true);
    setError('');
    try {
      if (action === 'archive') {
        await client.patch(`/products/${productId}/archive`);
      } else {
        await client.delete(`/products/${productId}`);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setConfirm(null);
      setError(getErrorMessage(err, `Unable to ${action} product`));
    } finally {
      actionInFlight.current = false;
      setSaving(false);
    }
  }

  const isDelete = confirm?.action === 'delete';
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STOCK CONTROL</p>
          <h1>Inventory</h1>
          <p>Monitor current stock and receive inventory into registered products.</p>
        </div>
        <Link className="secondary-btn" to="/scanner"><ScanLine size={17} /> Scan product</Link>
      </div>
      {error && <div className="form-error page-message" role="alert">{error}</div>}
      {saving && <div className="page-message" role="status">Saving product changes...</div>}
      {cacheInfo && (
        <div className="inventory-cache-notice" role="status">
          Showing saved inventory data from{' '}{new Date(cacheInfo.savedAt).toLocaleString()}.
          This view is read-only until fresh data loads.
        </div>
      )}
      <ProductFilters filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} />
      <GlassCard className="table-card">
        {loading ? <div className="page-loading">Loading inventory...</div> : products.length ? (
          <ProductTable products={products} account={account} readOnly={readOnly}
            onView={setDetailsProduct} onReceive={receive}
            onArchive={product => requestAction(product, 'archive')}
            onDelete={product => requestAction(product, 'delete')} />
        ) : <EmptyState title="Inventory is empty" description="Only Admin accounts can register a new product." />}
      </GlassCard>
      {selected && !readOnly && (
        <ReceiveStockModal product={selected} onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }} />
      )}
      {detailsProduct && (
        <ProductDetailsModal product={detailsProduct} onClose={() => setDetailsProduct(null)} onReceive={receive} />
      )}
      <ConfirmDialog open={Boolean(confirm)}
        title={isDelete ? 'Delete product?' : 'Archive product?'}
        message={confirm ? `Are you sure you want to ${isDelete ? 'delete' : 'archive'} ${confirm.product.name}?` : ''}
        danger confirmText={saving ? 'Saving...' : isDelete ? 'Delete' : 'Archive'}
        onCancel={() => { if (!actionInFlight.current) setConfirm(null); }}
        onConfirm={confirmAction} />
    </div>
  );
}
