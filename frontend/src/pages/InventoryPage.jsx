import { useEffect, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import ProductFilters from '../components/inventory/ProductFilters';
import ProductTable from '../components/inventory/ProductTable';
import ReceiveStockModal from '../components/inventory/ReceiveStockModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getErrorMessage } from '../utils/errors';
import { cachedGet } from '../services/offlineCache';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function InventoryPage() {
  const { account } = useAuth(); const { lastEvent } = useSocket(); const [products, setProducts] = useState([]); const [categories, setCategories] = useState([]); const [suppliers, setSuppliers] = useState([]); const [selected, setSelected] = useState(null); const [filters, setFilters] = useState({ search: '', category: '', supplier: '', status: '', sort: 'currentStock', page: 1 }); const [loading, setLoading] = useState(true); const [error, setError] = useState('');

  const isOnline = useOnlineStatus();
  const [cacheInfo, setCacheInfo] = useState(null);
  const readOnly = !isOnline || Boolean(cacheInfo);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value)
      );

      const [p, c, s] = await Promise.all([
        cachedGet(`/products?${query}`),
        cachedGet('/categories'),
        cachedGet('/suppliers')
      ]);

      setProducts(
        [...p.data].sort((a, b) =>
          filters.sort === 'updatedAt'
            ? new Date(b.updatedAt) - new Date(a.updatedAt)
            : a.currentStock - b.currentStock
        )
      );

      setCategories(c.data);
      setSuppliers(s.data);

      setCacheInfo(
        p.cached
          ? { savedAt: p.savedAt }
          : null
      );
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to load inventory')
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [
    filters.search,
    filters.category,
    filters.supplier,
    filters.status,
    filters.sort,
    lastEvent,
    isOnline
  ]);

  return <div><div className="page-heading"><div><p className="eyebrow">STOCK CONTROL</p><h1>Inventory</h1><p>Monitor current stock and receive inventory into registered products.</p></div><Link className="secondary-btn" to="/scanner"><ScanLine size={17} /> Scan product</Link></div>{error && <div className="form-error page-message">{error}</div>}{cacheInfo && (
    <div className="inventory-cache-notice" role="status">
      Showing saved inventory data from{' '}
      {new Date(cacheInfo.savedAt).toLocaleString()}.
      This view is read-only until fresh data loads.
    </div>
  )}<ProductFilters filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} /><GlassCard className="table-card">{loading ? <div className="page-loading">Loading inventory...</div> : products.length ? <ProductTable products={products} account={account} readOnly={readOnly} onReceive={setSelected} onArchive={() => {}} onDelete={() => {}} /> : <EmptyState title="Inventory is empty" description="Only Admin accounts can register a new product." />}</GlassCard>{selected && !readOnly && <ReceiveStockModal product={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />}</div>;
}