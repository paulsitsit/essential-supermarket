import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';

import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
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
    'Days left'
  ];

  const csvRows = rows.map(row => [
    row.productName,
    row.productBarcode,
    row.productSku,
    row.batchNumber,
    row.quantity,
    row.expirationDate
      ? String(row.expirationDate).slice(0, 10)
      : '',
    row.daysLeft ?? ''
  ]);

  const csvContent = [headers, ...csvRows]
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

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysLeft(expirationDate) {
  if (!expirationDate) {
    return null;
  }

  const expiry = new Date(expirationDate);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const today = getStartOfToday();

  return Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function normalizeBatches(data) {
  const batches = Array.isArray(data?.batches)
    ? data.batches
    : [];

  const rows = batches
    .map(batch => {
      const product = batch.product || {};

      return {
        _id: batch._id,
        batchNumber: batch.batchNumber || '—',
        quantity: Number(batch.quantity || 0),
        expirationDate: batch.expirationDate || null,
        daysLeft: getDaysLeft(batch.expirationDate),
        productName: product.name || 'Deleted product',
        productBarcode: product.barcode || '',
        productSku: product.sku || ''
      };
    })
    .sort((a, b) => {
      const aDays = a.daysLeft ?? Number.MAX_SAFE_INTEGER;
      const bDays = b.daysLeft ?? Number.MAX_SAFE_INTEGER;
      return aDays - bDays;
    });

  const summary = {
    within0to7: rows.filter(
      row => row.daysLeft !== null && row.daysLeft >= 0 && row.daysLeft <= 7
    ).length,

    within8to14: rows.filter(
      row => row.daysLeft !== null && row.daysLeft >= 8 && row.daysLeft <= 14
    ).length,

    within15to30: rows.filter(
      row => row.daysLeft !== null && row.daysLeft >= 15 && row.daysLeft <= 30
    ).length
  };

  return {
    rows,
    summary
  };
}

function SummaryCard({ label, value, color, background, border }) {
  return (
    <div
      style={{
        minHeight: 110,
        padding: 18,
        borderRadius: 16,
        border,
        background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      <strong
        style={{
          color,
          fontSize: 30,
          lineHeight: 1,
          marginBottom: 8
        }}
      >
        {value}
      </strong>

      <span
        style={{
          color: '#64748b',
          fontSize: 13,
          fontWeight: 600
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function ExpiringSoonPage() {
  const { lastEvent } = useSocket();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState({
    within0to7: 0,
    within8to14: 0,
    within15to30: 0
  });

  const [allRows, setAllRows] = useState([]);
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(30);

  async function fetchBatches() {
    const params = new URLSearchParams({
      days: String(days)
    });

    const response = await client.get(
      `/batches/expiring-soon?${params.toString()}`
    );

    return normalizeBatches(response.data);
  }

  async function load() {
    setLoading(true);
    setError('');

    try {
      const normalized = await fetchBatches();

      setSummary(normalized.summary);
      setAllRows(normalized.rows);
    } catch (err) {
      setSummary({
        within0to7: 0,
        within8to14: 0,
        within15to30: 0
      });

      setAllRows([]);

      setError(
        getErrorMessage(
          err,
          'Unable to load expiring batches'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [days]);

  useEffect(() => {
    if (
      lastEvent?.event === 'batchUpdated' ||
      lastEvent?.event === 'stockUpdated' ||
      lastEvent?.event === 'productUpdated'
    ) {
      load();
    }
  }, [lastEvent]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return allRows;
    }

    return allRows.filter(row =>
      row.productName.toLowerCase().includes(term) ||
      row.productBarcode.toLowerCase().includes(term) ||
      row.productSku.toLowerCase().includes(term) ||
      row.batchNumber.toLowerCase().includes(term)
    );
  }, [allRows, search]);

  async function exportCsv() {
    setExporting(true);
    setError('');

    try {
      const normalized = await fetchBatches();

      const term = search.trim().toLowerCase();

      const exportRows = !term
        ? normalized.rows
        : normalized.rows.filter(row =>
            row.productName.toLowerCase().includes(term) ||
            row.productBarcode.toLowerCase().includes(term) ||
            row.productSku.toLowerCase().includes(term) ||
            row.batchNumber.toLowerCase().includes(term)
          );

      if (!exportRows.length) {
        setError('There are no expiring batches to export.');
        return;
      }

      const stamp = new Date()
        .toISOString()
        .slice(0, 10);

      downloadCsv(
        `expiring-soon-${stamp}.csv`,
        exportRows
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to export expiring batches'
        )
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPIRY MANAGEMENT</p>
          <h1>Expiring Soon</h1>
          <p>
            Active batches expiring within the next {days} days.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={exportCsv}
            disabled={exporting || loading}
          >
            <Download size={16} />
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

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 20
        }}
      >
        <SummaryCard
          label="Expiring in 0–7 days"
          value={summary.within0to7}
          color="#b91c1c"
          background="#fff5f5"
          border="1px solid #fecaca"
        />

        <SummaryCard
          label="Expiring in 8–14 days"
          value={summary.within8to14}
          color="#b45309"
          background="#fffaf0"
          border="1px solid #fed7aa"
        />

        <SummaryCard
          label="Expiring in 15–30 days"
          value={summary.within15to30}
          color="#047857"
          background="#f0fdf4"
          border="1px solid #bbf7d0"
        />
      </div>

      <GlassCard className="table-card">
        <div
          className="filter-panel"
          style={{
            marginBottom: 18
          }}
        >
          <div
            className="search-input-wrapper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: 1
            }}
          >
            <Search size={16} style={{ color: '#64748b' }} />

            <input
              type="text"
              placeholder="Search product, barcode, SKU, or batch number"
              value={search}
              onChange={event => setSearch(event.target.value)}
              style={{
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Filter size={16} style={{ color: '#64748b' }} />

            <select
              value={days}
              onChange={event =>
                setDays(Number(event.target.value))
              }
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

        {loading ? (
          <div className="page-loading">
            Loading expiring batches...
          </div>
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch / Lot</th>
                  <th>Quantity</th>
                  <th>Expiration</th>
                  <th>Days Left</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map(batch => {
                  const isUrgent =
                    batch.daysLeft !== null &&
                    batch.daysLeft <= 7;

                  return (
                    <tr key={batch._id}>
                      <td>
                        <strong>{batch.productName}</strong>

                        <small className="table-subtext">
                          {batch.productBarcode || '—'} ·{' '}
                          {batch.productSku || '—'}
                        </small>
                      </td>

                      <td>
                        <strong className="mono-text">
                          {batch.batchNumber}
                        </strong>
                      </td>

                      <td>
                        <strong>{batch.quantity}</strong>
                      </td>

                      <td>
                        {batch.expirationDate
                          ? dateOnly(batch.expirationDate)
                          : '—'}
                      </td>

                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            color: isUrgent
                              ? '#b91c1c'
                              : '#047857',
                            background: isUrgent
                              ? '#fff1f2'
                              : '#ecfdf5'
                          }}
                        >
                          {batch.daysLeft === null
                            ? '—'
                            : batch.daysLeft === 0
                            ? 'Expires today'
                            : `${batch.daysLeft} days`}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="row-icon"
                          title="Open batch management"
                          onClick={() => {
                            window.location.href = '/batches';
                          }}
                        >
                          <CalendarClock size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No expiring batches found"
            description={
              search
                ? 'No batches match your search.'
                : `No active batches expire within the next ${days} days.`
            }
          />
        )}
      </GlassCard>
    </div>
  );
}