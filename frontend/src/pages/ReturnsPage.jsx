import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import EmptyState from '../components/common/EmptyState';
import GlassCard from '../components/common/GlassCard';
import { getErrorMessage } from '../utils/errors';
import { dateTime, peso } from '../utils/format';

function readableStatus(status) {
  return String(status || 'completed').replaceAll('_', ' ');
}

function statusClass(status) {
  const normalized = String(status || 'completed');

  if (normalized === 'refunded') {
    return 'movement-pill movement-expired';
  }

  if (normalized === 'partially_refunded') {
    return 'movement-pill movement-stockadjustment';
  }

  return 'movement-pill';
}

export default function ReturnsPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadReturns(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100'
      });

      if (saleId) {
        params.set('saleId', saleId);
      }

      const response = await client.get(
        `/returns?${params.toString()}`
      );

      setReturns(response.data.returns || []);
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to load return records.')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
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
          <h1>
            {saleId ? 'Sale return history' : 'Customer returns'}
          </h1>
          <p>
            Review completed refunds, original sale information,
            and return processing records.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => loadReturns(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
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

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <GlassCard className="table-card">
        {loading ? (
          <div className="page-loading">
            Loading return records...
          </div>
        ) : returns.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Return date</th>
                  <th>Return reference</th>
                  <th>Original sale</th>
                  <th>Cashier</th>
                  <th>Original total</th>
                  <th>Refund</th>
                  <th>Total refunded</th>
                  <th>Net sale</th>
                  <th>Sale status</th>
                  <th>Processed by</th>
                  <th>Reason</th>
                </tr>
              </thead>

              <tbody>
                {returns.map(returnRecord => {
                  const originalSale =
                    returnRecord.originalSale || null;

                  return (
                    <tr key={returnRecord._id}>
                      <td>
                        {dateTime(returnRecord.createdAt)}
                      </td>

                      <td>
                        <strong className="mono-text">
                          RTN-
                          {returnRecord._id
                            .slice(-8)
                            .toUpperCase()}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {returnRecord.saleReference || '—'}
                        </strong>

                        <small className="table-subtext">
                          {originalSale?.date
                            ? `Sale date: ${dateTime(
                                originalSale.date
                              )}`
                            : 'Original sale unavailable'}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {originalSale?.cashier?.fullName || '—'}
                        </strong>

                        <small className="table-subtext">
                          {originalSale?.cashier?.role || ''}
                        </small>
                      </td>

                      <td>
                        {peso(originalSale?.totalAmount || 0)}
                      </td>

                      <td className="quantity-negative">
                        {peso(returnRecord.totalRefund)}
                      </td>

                      <td className="quantity-negative">
                        {peso(originalSale?.refundedAmount || 0)}
                      </td>

                      <td>
                        <strong>
                          {peso(originalSale?.netAmount || 0)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            originalSale?.status
                          )}
                        >
                          {readableStatus(
                            originalSale?.status
                          )}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {returnRecord.processedBy?.fullName || '—'}
                        </strong>

                        <small className="table-subtext">
                          {returnRecord.processedBy?.role || ''}
                        </small>
                      </td>

                      <td>{returnRecord.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No return records found"
            description={
              saleId
                ? 'No returns have been processed for this sale.'
                : 'Completed customer returns will appear here.'
            }
          />
        )}
      </GlassCard>
    </div>
  );
}