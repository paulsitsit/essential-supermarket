import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import client from '../api/client';
import EmptyState from '../components/common/EmptyState';
import GlassCard from '../components/common/GlassCard';
import { getErrorMessage } from '../utils/errors';
import { dateTime, peso } from '../utils/format';

export default function ReturnsPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReturns() {
    setLoading(true);
    setError('');

    try {
      const query = saleId ? `?saleId=${saleId}` : '';
      const response = await client.get(`/returns${query}`);
      setReturns(response.data.returns || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load returns.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReturns();
  }, [saleId]);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RETURNS</p>
          <h1>{saleId ? 'Sale returns' : 'Customer returns'}</h1>
          <p>
            Review completed refunds and returned items.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={loadReturns}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="table-card">
        {loading ? (
          <div className="page-loading">Loading returns...</div>
        ) : returns.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Return ID</th>
                  <th>Sale</th>
                  <th>Items</th>
                  <th>Refund</th>
                  <th>Processed by</th>
                  <th>Reason</th>
                </tr>
              </thead>

              <tbody>
                {returns.map(returnRecord => (
                  <tr key={returnRecord._id}>
                    <td>{dateTime(returnRecord.createdAt)}</td>

                    <td>
                      <strong className="mono-text">
                        #{returnRecord._id.slice(-8)}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {returnRecord.sale?.saleNumber
                          ? `#${returnRecord.sale.saleNumber.slice(-8)}`
                          : '—'}
                      </strong>
                    </td>

                    <td>
                      <strong>{returnRecord.items?.length || 0}</strong>
                    </td>

                    <td className="quantity-negative">
                      {peso(returnRecord.totalRefund)}
                    </td>

                    <td>
                      {returnRecord.processedBy?.fullName || '—'}
                    </td>

                    <td>{returnRecord.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No returns found"
            description="Processed customer returns will appear here."
          />
        )}
      </GlassCard>
    </div>
  );
}