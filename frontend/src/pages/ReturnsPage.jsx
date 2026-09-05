import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  RefreshCw,
  Search
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import EmptyState from '../components/common/EmptyState';
import GlassCard from '../components/common/GlassCard';
import ReturnDetailsModal from '../components/sales/ReturnDetailsModal';
import { getErrorMessage } from '../utils/errors';
import { dateTime, peso } from '../utils/format';

function readableStatus(status) {
  return String(status || 'completed')
    .replaceAll('_', ' ');
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

function readableCondition(condition) {
  return String(condition || 'other')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character =>
      character.toUpperCase()
    );
}

function getReturnReference(returnRecord) {
  const id = String(returnRecord?._id || '');

  return id
    ? `RTN-${id.slice(-8).toUpperCase()}`
    : '—';
}

export default function ReturnsPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] =
    useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedReturnId, setSelectedReturnId] =
    useState(null);

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
        getErrorMessage(
          err,
          'Unable to load return records.'
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReturns();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId]);

  const filteredReturns = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return returns.filter(returnRecord => {
      const originalSale =
        returnRecord.originalSale || {};

      const searchableText = [
        getReturnReference(returnRecord),
        returnRecord.saleReference,
        originalSale.reference,
        originalSale.cashier?.fullName,
        returnRecord.processedBy?.fullName,
        returnRecord.reason,
        ...(returnRecord.items || []).map(
          item =>
            `${item.name} ${item.barcode} ${
              item.condition
            } ${item.reason || ''}`
        )
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const matchesCondition =
        conditionFilter === 'all' ||
        (returnRecord.items || []).some(
          item => item.condition === conditionFilter
        );

      const returnDate = returnRecord.createdAt
        ? new Date(returnRecord.createdAt)
        : null;

      const matchesFrom =
        !fromDate ||
        (returnDate &&
          returnDate >=
            new Date(`${fromDate}T00:00:00`));

      const matchesTo =
        !toDate ||
        (returnDate &&
          returnDate <=
            new Date(`${toDate}T23:59:59.999`));

      return (
        matchesSearch &&
        matchesCondition &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    returns,
    search,
    conditionFilter,
    fromDate,
    toDate
  ]);

  const summary = useMemo(() => {
    return filteredReturns.reduce(
      (totals, returnRecord) => {
        totals.records += 1;

        totals.refund += Number(
          returnRecord.totalRefund || 0
        );

        totals.items += (returnRecord.items || []).reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0),
          0
        );

        totals.resellable += (returnRecord.items || [])
          .filter(item => item.condition === 'resellable')
          .reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0),
            0
          );

        totals.quarantine += (returnRecord.items || [])
          .filter(item => item.condition !== 'resellable')
          .reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0),
            0
          );

        return totals;
      },
      {
        records: 0,
        refund: 0,
        items: 0,
        resellable: 0,
        quarantine: 0
      }
    );
  }, [filteredReturns]);

  function clearFilters() {
    setSearch('');
    setConditionFilter('all');
    setFromDate('');
    setToDate('');
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RETURNS</p>

          <h1>
            {saleId
              ? 'Sale return history'
              : 'Customer returns'}
          </h1>

          <p>
            Review refunds, returned products, stock
            destinations, and processing history.
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
            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
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

      <div className="summary-grid">
        <GlassCard className="summary-card">
          <div>
            <p>Return records</p>
            <h2>{summary.records}</h2>
            <small>
              Matching return transactions
            </small>
          </div>
        </GlassCard>

        <GlassCard className="summary-card">
          <div>
            <p>Total refunded</p>
            <h2 className="quantity-negative">
              {peso(summary.refund)}
            </h2>
            <small>
              Value refunded to customers
            </small>
          </div>
        </GlassCard>

        <GlassCard className="summary-card">
          <div>
            <p>Units returned</p>
            <h2>{summary.items}</h2>
            <small>
              Total products returned
            </small>
          </div>
        </GlassCard>

        <GlassCard className="summary-card">
          <div>
            <p>Restocked</p>
            <h2 className="quantity-positive">
              {summary.resellable}
            </h2>
            <small>
              Resellable units returned to stock
            </small>
          </div>
        </GlassCard>

        <GlassCard className="summary-card">
          <div>
            <p>Quarantined</p>
            <h2 className="quantity-negative">
              {summary.quarantine}
            </h2>
            <small>
              Non-resellable returned units
            </small>
          </div>
        </GlassCard>
      </div>

      <GlassCard
        className="table-card"
        style={{ marginTop: 16 }}
      >
        <div
          className="filter-panel"
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(240px, 1fr) repeat(3, minmax(150px, auto)) auto',
            gap: 10,
            alignItems: 'center'
          }}
        >
          <div
            className="search-input-wrapper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Search
              size={16}
              style={{ color: '#888' }}
            />

            <input
              type="text"
              value={search}
              onChange={event =>
                setSearch(event.target.value)
              }
              placeholder="Search receipt, return ID, product, cashier, or reason"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>

          <select
            value={conditionFilter}
            onChange={event =>
              setConditionFilter(event.target.value)
            }
          >
            <option value="all">
              All conditions
            </option>

            <option value="resellable">
              Resellable
            </option>

            <option value="damaged">
              Damaged
            </option>

            <option value="opened">
              Opened
            </option>

            <option value="expired">
              Expired
            </option>

            <option value="other">
              Other
            </option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={event =>
              setFromDate(event.target.value)
            }
            aria-label="Returns from date"
          />

          <input
            type="date"
            value={toDate}
            onChange={event =>
              setToDate(event.target.value)
            }
            aria-label="Returns to date"
          />

          <button
            type="button"
            className="secondary-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>

        {loading ? (
          <div className="page-loading">
            Loading return records...
          </div>
        ) : filteredReturns.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Return date</th>
                  <th>Return reference</th>
                  <th>Original receipt</th>
                  <th>Cashier</th>
                  <th>Refund</th>
                  <th>Items</th>
                  <th>Destination</th>
                  <th>Sale status</th>
                  <th>Processed by</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredReturns.map(returnRecord => {
                  const originalSale =
                    returnRecord.originalSale || {};

                  const items =
                    returnRecord.items || [];

                  const returnedUnits = items.reduce(
                    (sum, item) =>
                      sum + Number(item.quantity || 0),
                    0
                  );

                  const restockedUnits = items
                    .filter(
                      item =>
                        item.condition === 'resellable'
                    )
                    .reduce(
                      (sum, item) =>
                        sum +
                        Number(item.quantity || 0),
                      0
                    );

                  const quarantineUnits = items
                    .filter(
                      item =>
                        item.condition !== 'resellable'
                    )
                    .reduce(
                      (sum, item) =>
                        sum +
                        Number(item.quantity || 0),
                      0
                    );

                  return (
                    <tr key={returnRecord._id}>
                      <td>
                        {dateTime(
                          returnRecord.createdAt
                        )}
                      </td>

                      <td>
                        <strong className="mono-text">
                          {getReturnReference(
                            returnRecord
                          )}
                        </strong>
                      </td>

                      <td>
                        <strong className="mono-text">
                          {returnRecord.saleReference ||
                            originalSale.reference ||
                            '—'}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {originalSale.cashier?.fullName ||
                            '—'}
                        </strong>

                        <small className="table-subtext">
                          {originalSale.cashier?.role ||
                            ''}
                        </small>
                      </td>

                      <td className="quantity-negative">
                        <strong>
                          {peso(
                            returnRecord.totalRefund
                          )}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {returnedUnits}
                        </strong>

                        <small className="table-subtext">
                          {items.length} product
                          {items.length === 1 ? '' : 's'}
                        </small>
                      </td>

                      <td>
                        {restockedUnits > 0 && (
                          <small
                            className="table-subtext quantity-positive"
                            style={{
                              display: 'block',
                              fontWeight: 700
                            }}
                          >
                            Restocked: {restockedUnits}
                          </small>
                        )}

                        {quarantineUnits > 0 && (
                          <small
                            className="table-subtext quantity-negative"
                            style={{
                              display: 'block',
                              fontWeight: 700
                            }}
                          >
                            Quarantine: {quarantineUnits}
                          </small>
                        )}

                        {!restockedUnits &&
                          !quarantineUnits && (
                            <small className="table-subtext">
                              —
                            </small>
                          )}
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            originalSale.status
                          )}
                        >
                          {readableStatus(
                            originalSale.status
                          )}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {returnRecord.processedBy
                            ?.fullName || '—'}
                        </strong>

                        <small className="table-subtext">
                          {returnRecord.processedBy
                            ?.role || ''}
                        </small>
                      </td>

                      <td>
                        {returnRecord.reason || '—'}
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="row-icon"
                            title="View return details"
                            onClick={() =>
                              setSelectedReturnId(
                                returnRecord._id
                              )
                            }
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
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
                : 'Try changing the filters or process a customer return.'
            }
          />
        )}
      </GlassCard>

      {selectedReturnId && (
        <ReturnDetailsModal
          returnId={selectedReturnId}
          onClose={() => setSelectedReturnId(null)}
        />
      )}
    </div>
  );
}