import { useEffect, useState } from 'react';
import { Download, FileBarChart, RefreshCw } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import { peso, dateTime, movementLabel } from '../utils/format';
import { downloadCsv } from '../utils/download';
import { downloadServerReport } from '../utils/serverExport';
import { getErrorMessage } from '../utils/errors';


const reports = [
  { id: 'inventory', title: 'Current Inventory Report', description: 'All active products and current quantities.', endpoint: '/reports/inventory' },
  { id: 'low-stock', title: 'Low-Stock Report', description: 'Products at or below reorder levels.', endpoint: '/reports/low-stock' },
  { id: 'stock-movements', title: 'Stock Movement Report', description: 'Inventory changes and movement history.', endpoint: '/reports/stock-movements' }
];


export default function ReportsPage() {
  const [active, setActive] = useState('inventory');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = reports.find(report => report.id === active);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await client.get(selected.endpoint);
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load report'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [active]);

  function exportCsv() {
    const rows = (data?.rows || []).map(row =>
      active === 'stock-movements'
        ? { product: row.product?.name, barcode: row.product?.barcode, movementType: movementLabel(row.movementType), quantityChanged: row.quantityChanged, previousStock: row.previousStock, newStock: row.newStock, reason: row.reason, account: row.account?.fullName, createdAt: dateTime(row.createdAt) }
        : { product: row.name, barcode: row.barcode, sku: row.sku, category: row.category?.name, supplier: row.supplier?.name, currentStock: row.currentStock, reorderLevel: row.reorderLevel, costPrice: peso(row.costPrice), inventoryValue: peso(row.inventoryValue), status: row.status }
    );
    downloadCsv(`${active}-report.csv`, rows);
  }

  async function exportReport(format) {
    try {
      await downloadServerReport(active, format);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to export report'));
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY ANALYTICS</p>
          <h1>Reports</h1>
          <p>View and export inventory-only reports.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-btn" onClick={load}><RefreshCw size={16} /> Refresh</button>
          <button className="secondary-btn" onClick={exportCsv} disabled={!data?.rows?.length}><Download size={16} /> Export CSV</button>
          <button className="secondary-btn" onClick={() => exportReport('pdf')}>PDF</button>
          <button className="secondary-btn" onClick={() => exportReport('xlsx')}>Excel</button>
          <button className="secondary-btn" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="report-grid">
        {reports.map(report => (
          <button
            key={report.id}
            className={active === report.id ? 'report-option active-report' : 'report-option'}
            onClick={() => setActive(report.id)}
          >
            <FileBarChart size={19} />
            <span>
              <strong>{report.title}</strong>
              <small>{report.description}</small>
            </span>
          </button>
        ))}
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="report-result">
        <div className="section-heading">
          <div>
            <h3>{selected.title}</h3>
            <p>Generated {data?.generatedAt ? dateTime(data.generatedAt) : '—'}</p>
          </div>
        </div>
        {loading ? (
          <div className="page-loading">Generating report...</div>
        ) : (
          <div className="report-stat">
            <span>Rows returned</span>
            <strong>{data?.rows?.length || 0}</strong>
          </div>
        )}
        <div className="report-note">
          PDF, Excel, print, and advanced date/category filters can be connected to the report export service in the deployment part.
        </div>
      </GlassCard>
    </div>
  );
}