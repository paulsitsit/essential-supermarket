import { useEffect, useState } from 'react';
import { CalendarClock, Filter, RefreshCw, Search } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getErrorMessage } from '../utils/errors';
import { dateOnly } from '../utils/format';


function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}


function downloadCsv(filename, rows) {
  const headers = [
    'Product',
    'Barcode',
    'SKU',
    'Batch / lot',
    'Quantity',
    'Expiration date',
    'Days left',
    'Category',
    'Supplier'
  ];

  const csvRows = rows.map(row => [
    row.productName,
    row.productBarcode,
    row.productSku,
    row.batchNumber,
    row.quantity,
    row.expirationDate ? row.expirationDate.slice(0, 10) : '',
    row.daysLeft ?? '',
    row.category?._id || row.category || '',
    row.supplier?._id || row.supplier || ''
  ]);

  const csvContent =
    [headers, ...csvRows]
      .map(row => row.map(escapeCsvValue).join(','))
      .join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


export default function ExpiringSoonPage() {
  const { account } = useAuth();
  const { lastEvent } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState({
    within0to7: 0,
    within8to14: 0,
    within15to30: 0
  });

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('days', days);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (supplier) params.set('supplier', supplier);

      const res = await client.get(`/reports/expiring-soon?${params.toString()}`);
      const data = res.data;

      setSummary(data.summary || {
        within0to7: 0,
        within8to14: 0,
        within15to30: 0
      });
      setRows(data.rows || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load expiring soon report'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [lastEvent]);

  async function exportCsv() {
    setExporting(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('days', days);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (supplier) params.set('supplier', supplier);

      const res = await client.get(`/reports/expiring-soon?${params.toString()}`);
      const data = res.data;

      const rows = data.rows || [];

      if (!rows.length) {
        setError('There are no expiring batches to export.');
        return;
      }

      const now = new Date();
      const stamp = now.toISOString().slice(0, 10);
      downloadCsv(`expiring-soon-${stamp}.csv`, rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to export expiring batches'));
    } finally {
      setExporting(false);
    }
  }

  const canManage = ['admin', 'manager'].includes(account?.role);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPIRY MANAGEMENT</p>
          <h1>Expiring Soon</h1>
          <p>Batches expiring within the next {days} days.</p>
        </div>

        <div className="heading-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={exportCsv}
            disabled={exporting || loading}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="table-card">
        <div className="filter-panel">
          <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Search size={16} style={{ color: '#888' }} />
            <input
              type="text"
              placeholder="Search by product name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: '#888' }} />
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={30}>Next 30 days</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}
        >
          <GlassCard
            style={{
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 28,
                color: '#b91c1c'
              }}
            >
              {summary.within0to7}
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              Expiring in 0–7 days
            </div>
          </GlassCard>

          <GlassCard
            style={{
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 28,
                color: '#b45309'
              }}
            >
              {summary.within8to14}
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              Expiring in 8–14 days
            </div>
          </GlassCard>

          <GlassCard
            style={{
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 28,
                color: '#065f46'
              }}
            >
              {summary.within15to30}
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              Expiring in 15–30 days
            </div>
          </GlassCard>
        </div>

        {loading ? (
          <div className="page-loading">Loading expiring batches...</div>
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch / lot</th>
                  <th>Quantity</th>
                  <th>Expiration</th>
                  <th>Days left</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map(batch => {
                  const daysLeft = batch.daysLeft;
                  return (
                    <tr key={batch._id}>
                      <td>
                        <strong>{batch.productName || 'Deleted product'}</strong>
                        <small className="table-subtext">
                          {batch.productBarcode || '—'} · {batch.productSku || '—'}
                        </small>
                      </td>
                      <td>
                        <strong className="mono-text">{batch.batchNumber || '—'}</strong>
                      </td>
                      <td>
                        <strong>{batch.quantity ?? 0}</strong>
                      </td>
                      <td>
                        <span
                          className={
                            daysLeft != null && daysLeft <= 7
                              ? 'status-warning'
                              : ''
                          }
                          style={{
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4
                          }}
                        >
                          {batch.expirationDate ? dateOnly(batch.expirationDate) : '—'}
                        </span>
                      </td>
                      <td>
                        {daysLeft == null ? (
                          '—'
                        ) : daysLeft < 0 ? (
                          <span className="status-critical" style={{ fontWeight: 700 }}>
                            Expired {Math.abs(daysLeft)}d ago
                          </span>
                        ) : (
                          <span
                            style={{
                              fontWeight: 600,
                              color:
                                daysLeft <= 7
                                  ? '#b45309'
                                  : '#065f46'
                            }}
                          >
                            {daysLeft} days
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="row-icon"
                              title="View batch"
                              onClick={() => {
                                // TODO: open batch details / expiry correction
                                window.alert('Batch details / expiry correction coming next');
                              }}
                            >
                              <CalendarClock size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No expiring batches found"
            description="Adjust your filters or extend the date range."
          />
        )}
      </GlassCard>
    </div>
  );
}