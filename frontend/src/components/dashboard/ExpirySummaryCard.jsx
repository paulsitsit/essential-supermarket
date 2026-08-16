import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import client from '../../api/client';
import GlassCard from '../common/GlassCard';
import { getErrorMessage } from '../../utils/errors';
import { dateOnly } from '../../utils/format';

export default function ExpirySummaryCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/dashboard/expiry-summary');
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load expiry summary'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <GlassCard style={{ padding: 12 }}>
        <div className="page-loading" style={{ fontSize: 13 }}>
          Loading expiry summary...
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard style={{ padding: 12 }}>
        <div className="form-error" style={{ fontSize: 13 }}>
          {error}
        </div>
      </GlassCard>
    );
  }

  const summary = data?.summary || {
    within0to7: 0,
    within8to14: 0,
    within15to30: 0
  };

  const urgent = data?.urgent || [];

  return (
    <GlassCard style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <CalendarClock size={18} />
        <h3 style={{ fontSize: 15, margin: 0 }}>Expiring Batches</h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 12
        }}
      >
        <div
          style={{
            padding: 8,
            borderRadius: 6,
            background: '#fef2f2',
            border: '1px solid #fecaca'
          }}
        >
          <div style={{ fontSize: 12, color: '#7f1d1d' }}>0–7 days</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#b91c1c' }}>
            {summary.within0to7}
          </div>
        </div>

        <div
          style={{
            padding: 8,
            borderRadius: 6,
            background: '#fff7ed',
            border: '1px solid #fed7aa'
          }}
        >
          <div style={{ fontSize: 12, color: '#7c2d12' }}>8–14 days</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>
            {summary.within8to14}
          </div>
        </div>

        <div
          style={{
            padding: 8,
            borderRadius: 6,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0'
          }}
        >
          <div style={{ fontSize: 12, color: '#064e3b' }}>15–30 days</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
            {summary.within15to30}
          </div>
        </div>
      </div>

      {urgent.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Most urgent (0–7 days)
          </div>

          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {urgent.map(row => (
                  <tr key={row.batchId}>
                    <td>
                      <strong>{row.productName}</strong>
                      <small className="table-subtext" style={{ fontSize: 11 }}>
                        {row.barcode || '—'}
                      </small>
                    </td>
                    <td>
                      <strong className="mono-text">{row.batchNumber}</strong>
                    </td>
                    <td>
                      <strong>{row.quantity}</strong>
                    </td>
                    <td>
                      {row.expirationDate ? dateOnly(row.expirationDate) : '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: row.daysLeft <= 3 ? '#b91c1c' : '#b45309'
                        }}
                      >
                        {row.daysLeft}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </GlassCard>
  );
}