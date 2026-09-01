import { useEffect, useState } from 'react';
import { Download, FileBarChart, RefreshCw } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import { peso, dateTime, movementLabel } from '../utils/format';
import { downloadCsv } from '../utils/download';
import { downloadServerReport } from '../utils/serverExport';
import { getErrorMessage } from '../utils/errors';

const reports = [
  {
    id: 'inventory',
    title: 'Current Inventory Report',
    description: 'All active products and current quantities.',
    endpoint: '/reports/inventory'
  },
  {
    id: 'low-stock',
    title: 'Low-Stock Report',
    description: 'Products at or below reorder levels.',
    endpoint: '/reports/low-stock'
  },
  {
    id: 'stock-movements',
    title: 'Stock Movement Report',
    description: 'Inventory changes and movement history.',
    endpoint: '/reports/stock-movements'
  },
  {
    id: 'sales-returns',
    title: 'Sales & Returns Report',
    description: 'Gross sales, refunds, and net revenue by date.',
    endpoint: '/reports/sales-returns'
  }
];

export default function ReportsPage() {
  const [active, setActive] = useState('inventory');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const selected = reports.find(report => report.id === active);

  async function load() {
    setLoading(true);
    setError('');

    try {
      let endpoint = selected.endpoint;

      if (active === 'sales-returns') {
        const from = dateFrom || new Date().toISOString().split('T')[0];
        const to = dateTo || from;

        endpoint = `${endpoint}?from=${from}&to=${to}`;
      }

      const { data: response } = await client.get(endpoint);
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load report'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [active]);

  useEffect(() => {
    if (active === 'sales-returns') {
      load();
    }
  }, [dateFrom, dateTo]);

  function exportCsv() {
    if (active === 'sales-returns') {
      const rows = (data?.rows || []).map(row => ({
        date: row.date,
        grossSales: peso(row.grossSales),
        refunds: peso(row.refunds),
        netRevenue: peso(row.netRevenue),
        transactions: row.transactions,
        returnsCount: row.returnsCount
      }));

      downloadCsv(`${active}-report.csv`, rows);
      return;
    }

    const rows = (data?.rows || []).map(row =>
      active === 'stock-movements'
        ? {
            product: row.product?.name,
            barcode: row.product?.barcode,
            movementType: movementLabel(row.movementType),
            quantityChanged: row.quantityChanged,
            previousStock: row.previousStock,
            newStock: row.newStock,
            reason: row.reason,
            account: row.account?.fullName,
            createdAt: dateTime(row.createdAt)
          }
        : {
            product: row.name,
            barcode: row.barcode,
            sku: row.sku,
            category: row.category?.name,
            supplier: row.supplier?.name,
            currentStock: row.currentStock,
            reorderLevel: row.reorderLevel,
            costPrice: peso(row.costPrice),
            inventoryValue: peso(row.inventoryValue),
            status: row.status
          }
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

  const isSalesReturns = active === 'sales-returns';
  const summary = data?.summary;
  const rows = data?.rows || [];

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY ANALYTICS</p>
          <h1>Reports</h1>
          <p>View and export inventory and sales reports.</p>
        </div>

        <div className="heading-actions">
          <button className="secondary-btn" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>

          <button
            className="secondary-btn"
            onClick={exportCsv}
            disabled={!data?.rows?.length}
          >
            <Download size={16} /> Export CSV
          </button>

          <button className="secondary-btn" onClick={() => exportReport('pdf')}>
            PDF
          </button>

          <button className="secondary-btn" onClick={() => exportReport('xlsx')}>
            Excel
          </button>

          <button className="secondary-btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <div className="report-grid">
        {reports.map(report => (
          <button
            key={report.id}
            className={
              active === report.id ? 'report-option active-report' : 'report-option'
            }
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

      {isSalesReturns && (
        <GlassCard className="report-result" style={{ marginTop: 16 }}>
          <div className="section-heading">
            <div>
              <h3>Date range</h3>
              <p>Select the period for the Sales & Returns Report</p>
            </div>
          </div>

          <div className="modal-form" style={{ marginTop: 8 }}>
            <label>
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
              />
            </label>

            <label>
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
              />
            </label>
          </div>
        </GlassCard>
      )}

      <GlassCard className="report-result" style={{ marginTop: 16 }}>
        <div className="section-heading">
          <div>
            <h3>{selected.title}</h3>
            <p>
              Generated{' '}
              {data?.generatedAt ? dateTime(data.generatedAt) : '—'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="page-loading">Generating report...</div>
        ) : isSalesReturns && summary ? (
          <>
            <div
              className="summary-grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                marginBottom: 16
              }}
            >
              <div className="report-stat">
                <span>Gross sales</span>
                <strong>{peso(summary.grossSales)}</strong>
              </div>

              <div className="report-stat">
                <span>Refunds</span>
                <strong className="quantity-negative">
                  {peso(summary.refunds)}
                </strong>
              </div>

              <div className="report-stat">
                <span>Net revenue</span>
                <strong className="quantity-positive">
                  {peso(summary.netRevenue)}
                </strong>
              </div>

              <div className="report-stat">
                <span>Transactions</span>
                <strong>{summary.transactions}</strong>
              </div>

              <div className="report-stat">
                <span>Return records</span>
                <strong>{summary.returnsCount}</strong>
              </div>

              <div className="report-stat">
                <span>Average return</span>
                <strong>{peso(summary.averageReturn)}</strong>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Gross sales</th>
                    <th>Refunds</th>
                    <th>Net revenue</th>
                    <th>Transactions</th>
                    <th>Returns</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map(row => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{peso(row.grossSales)}</td>
                      <td className="quantity-negative">
                        {peso(row.refunds)}
                      </td>
                      <td className="quantity-positive">
                        {peso(row.netRevenue)}
                      </td>
                      <td>{row.transactions}</td>
                      <td>{row.returnsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-stat" style={{ marginTop: 12 }}>
              <span>Rows returned</span>
              <strong>{rows.length}</strong>
            </div>
          </>
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