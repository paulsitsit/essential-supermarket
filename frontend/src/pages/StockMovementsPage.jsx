import { useEffect, useMemo, useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import MovementTable from '../components/movements/MovementTable';
import { getErrorMessage } from '../utils/errors';
import { dateTime, movementLabel } from '../utils/format';
import { downloadServerReport } from '../utils/serverExport';

import './StockMovementsPage.css';

const MOVEMENT_TYPES = [
  { value: 'stock_in', label: 'Stock In' },
  { value: 'sale', label: 'Sale' },
  { value: 'stock_adjustment', label: 'Stock Adjustment' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'returned_to_supplier', label: 'Returned to Supplier' },
  { value: 'branch_transfer', label: 'Branch Transfer' },
  { value: 'manual_correction', label: 'Manual Correction' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'quarantine_release', label: 'Quarantine Release' },
  { value: 'quarantine_disposal', label: 'Quarantine Disposal' },
  { value: 'return_to_supplier', label: 'Return to Supplier' }
];

export default function StockMovementsPage() {
  const { account } = useAuth();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ product: '', movementType: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  // The existing backend export endpoint permits only admin and manager roles.
  const canExport = ['admin', 'manager'].includes(account?.role);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value)
      );

      const [movementResponse, productResponse] = await Promise.all([
        client.get(`/stock-movements?${query.toString()}`),
        client.get('/products')
      ]);

      setMovements(Array.isArray(movementResponse.data) ? movementResponse.data : []);
      setProducts(Array.isArray(productResponse.data) ? productResponse.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load stock movements.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.product, filters.movementType]);

  function reset() {
    setFilters({ product: '', movementType: '' });
  }

  async function exportReport(format) {
    setExporting(format);
    setError('');

    try {
      const selectedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );
      await downloadServerReport('stock-movements', format, selectedFilters);
    } catch (err) {
      setError(getErrorMessage(err, `Unable to export the ${format.toUpperCase()} report.`));
    } finally {
      setExporting('');
    }
  }

  function printReport() {
    const bodyClass = 'print-stock-movements';
    document.body.classList.add(bodyClass);

    const cleanup = () => {
      document.body.classList.remove(bodyClass);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  const selectedProduct = products.find(product => product._id === filters.product);
  const filterDescription = [
    filters.movementType ? `Movement type: ${movementLabel(filters.movementType)}` : 'Movement type: All types',
    selectedProduct ? `Product: ${selectedProduct.name}` : 'Product: All products'
  ].join(' · ');

  // Counts and net quantity are based on the currently displayed movement records.
  const movementSummary = useMemo(() => MOVEMENT_TYPES.map(type => {
    const matching = movements.filter(item => item.movementType === type.value);
    const netQuantity = matching.reduce(
      (total, item) => total + (Number(item.quantityChanged) || 0),
      0
    );

    return { ...type, count: matching.length, netQuantity };
  }), [movements]);

  const movementTotal = movements.length;

  return (
    <div className="stock-movements-page">
      <div className="page-heading stock-movements-screen-only">
        <div>
          <p className="eyebrow">AUDITABLE INVENTORY ACTIVITY</p>
          <h1>Stock Movements</h1>
          <p>Review, report, and print inventory changes across every movement type.</p>
        </div>

        <div className="heading-actions stock-movements-actions">
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>

          <button type="button" className="secondary-btn" onClick={printReport} disabled={loading || !movementTotal}>
            <Printer size={15} /> Print
          </button>

          {canExport && (
            <>
              <button type="button" className="secondary-btn" onClick={() => exportReport('pdf')} disabled={loading || Boolean(exporting)}>
                <FileDown size={15} /> {exporting === 'pdf' ? 'Preparing PDF…' : 'PDF Report'}
              </button>
              <button type="button" className="secondary-btn" onClick={() => exportReport('xlsx')} disabled={loading || Boolean(exporting)}>
                <FileSpreadsheet size={15} /> {exporting === 'xlsx' ? 'Preparing Excel…' : 'Excel Report'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="form-error page-message stock-movements-screen-only">{error}</div>}

      <div className="filter-panel glass-card stock-movements-screen-only">
        <select aria-label="Filter by product" value={filters.product} onChange={event => setFilters({ ...filters, product: event.target.value })}>
          <option value="">All products</option>
          {products.map(product => <option key={product._id} value={product._id}>{product.name}</option>)}
        </select>

        <select aria-label="Filter by movement type" value={filters.movementType} onChange={event => setFilters({ ...filters, movementType: event.target.value })}>
          <option value="">All movement types</option>
          {MOVEMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>

        <button type="button" className="icon-text-btn" onClick={reset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      <div className="stock-movements-print-area">
        <header className="stock-movements-print-header">
          <h1>Essential Supermarket</h1>
          <h2>Stock Movements Report</h2>
          <p>Generated: {dateTime(new Date())}</p>
          <p>{filterDescription}</p>
          <p>Total movements in this report: {movementTotal}</p>
        </header>

        <section className="movement-report-summary">
          <div className="movement-summary-heading">
            <div>
              <h2>Movement Type Summary</h2>
              <p>Count and net quantity change for the movement records currently displayed.</p>
            </div>
            <strong>{movementTotal} total</strong>
          </div>

          <div className="movement-summary-grid">
            {movementSummary.map(type => (
              <article className="movement-summary-card" key={type.value}>
                <span>{type.label}</span>
                <strong>{type.count}</strong>
                <small>Net quantity: {type.netQuantity > 0 ? '+' : ''}{type.netQuantity}</small>
              </article>
            ))}
          </div>
        </section>

        <GlassCard className="table-card stock-movements-table-card">
          {loading ? (
            <div className="page-loading">Loading movements...</div>
          ) : movements.length ? (
            <MovementTable movements={movements} />
          ) : (
            <EmptyState title="No movements found" description="Stock activity will appear here after a movement is saved." />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
