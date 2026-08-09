import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import MovementTable from '../components/movements/MovementTable';
import { getErrorMessage } from '../utils/errors';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]); const [products, setProducts] = useState([]); const [filters, setFilters] = useState({ product: '', movementType: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)); const [m, p] = await Promise.all([client.get(`/stock-movements?${query}`), client.get('/products')]); setMovements(m.data); setProducts(p.data); } catch (err) { setError(getErrorMessage(err)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [filters.product, filters.movementType]);
  function reset() { setFilters({ product: '', movementType: '' }); }
  return <div><div className="page-heading"><div><p className="eyebrow">AUDITABLE INVENTORY ACTIVITY</p><h1>Stock Movements</h1><p>Review every stock-in, adjustment, damaged, and expired movement.</p></div></div>{error && <div className="form-error page-message">{error}</div>}<div className="filter-panel glass-card"><select value={filters.product} onChange={e => setFilters({ ...filters, product: e.target.value })}><option value="">All products</option>{products.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select value={filters.movementType} onChange={e => setFilters({ ...filters, movementType: e.target.value })}><option value="">All movement types</option><option value="stock_in">Stock In</option><option value="stock_adjustment">Stock Adjustment</option><option value="damaged">Damaged</option><option value="expired">Expired</option><option value="returned_to_supplier">Returned to Supplier</option><option value="branch_transfer">Branch Transfer</option><option value="manual_correction">Manual Correction</option></select><button className="icon-text-btn" onClick={reset}><RotateCcw size={15} /> Reset</button></div><GlassCard className="table-card">{loading ? <div className="page-loading">Loading movements...</div> : movements.length ? <MovementTable movements={movements} /> : <EmptyState title="No movements found" description="Stock activity will appear here after a movement is saved." />}</GlassCard></div>;
}