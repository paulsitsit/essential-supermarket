import { useEffect, useState } from 'react';
import {
  Camera,
  Eye,
  RefreshCw,
  Search,
  ReceiptText
} from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import SaleDetailsModal from '../components/sales/SaleDetailsModal';
import ReceiptScannerModal from '../components/sales/ReceiptScannerModal';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { dateTime, peso } from '../utils/format';

function normalizeReceiptInput(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  /*
   * Supports raw receipt numbers and a QR payload copied
   * from the POS receipt, for example:
   *
   * {"receiptNumber":"ES-MAIN-20260905-000004","saleId":"..."}
   */
  if (text.startsWith('{')) {
    try {
      const payload = JSON.parse(text);

      if (payload?.receiptNumber) {
        return String(payload.receiptNumber)
          .trim()
          .toUpperCase();
      }
    } catch {
      // Fall through and treat the input as a normal receipt number.
    }
  }

  return text.toUpperCase();
}

export default function SalesPage() {
  const { account } = useAuth();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [showReceiptScanner, setShowReceiptScanner] =
    useState(false);

  async function load(resetPage = false) {
    setLoading(true);
    setError('');

    try {
      const currentPage = resetPage ? 1 : page;

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit)
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await client.get(
        `/sales?${params.toString()}`
      );

      const data = response.data;

      setSales(data.sales || []);
      setTotal(data.pagination?.total || 0);

      if (resetPage) {
        setPage(1);
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load sales'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function findReceipt() {
    const normalizedReceipt = normalizeReceiptInput(
      receiptNumber
    );

    if (!normalizedReceipt) {
      setError('Enter or scan a receipt number first.');
      return;
    }

    setLookupLoading(true);
    setError('');

    try {
      const response = await client.get(
        `/sales/receipt/${encodeURIComponent(
          normalizedReceipt
        )}`
      );

      const matchedSale = response.data?.sale;

      if (!matchedSale) {
        setError('No sale was found for that receipt.');
        return;
      }

      setReceiptNumber(
        matchedSale.receiptNumber ||
          normalizedReceipt
      );

      setSelectedSale(matchedSale);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No sale was found for that receipt.'
        )
      );
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleReceiptDetected(scannedReceiptNumber) {
    setReceiptNumber(scannedReceiptNumber);
    setShowReceiptScanner(false);

    setLookupLoading(true);
    setError('');

    try {
      const response = await client.get(
        `/sales/receipt/${encodeURIComponent(
          scannedReceiptNumber
        )}`
      );

      const matchedSale = response.data?.sale;

      if (!matchedSale) {
        setError('No sale was found for that receipt.');
        return;
      }

      setSelectedSale(matchedSale);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No sale was found for that receipt.'
        )
      );
    } finally {
      setLookupLoading(false);
    }
  }

  function handleReceiptKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      findReceipt();
    }
  }

  function openDetails(sale) {
    setSelectedSale(sale);
  }

  function handleSearchChange(event) {
    setPage(1);
    setSearch(event.target.value);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SALES</p>
          <h1>Sales</h1>
          <p>
            Search transactions, verify receipts, and process eligible returns.
          </p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => load(false)}
          disabled={loading || lookupLoading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <GlassCard
        className="table-card"
        style={{ marginBottom: 16 }}
      >
        <div className="section-heading">
          <div>
            <h3>Receipt lookup</h3>
            <p>
              Enter a receipt number or paste scanned QR receipt data.
            </p>
          </div>
        </div>

        <div
          className="filter-panel"
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <div
            className="search-input-wrapper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: '1 1 300px'
            }}
          >
            <ReceiptText
              size={17}
              style={{ color: '#15803d' }}
            />

            <input
              type="text"
              placeholder="Example: ES-MAIN-20260905-000004"
              value={receiptNumber}
              onChange={event =>
                setReceiptNumber(event.target.value)
              }
              onKeyDown={handleReceiptKeyDown}
              disabled={lookupLoading}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setError('');
              setShowReceiptScanner(true);
            }}
            disabled={lookupLoading}
          >
            <Camera size={16} />
            Scan receipt QR
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={findReceipt}
            disabled={lookupLoading}
          >
            <Search size={16} />
            {lookupLoading
              ? 'Finding...'
              : 'Find receipt'}
          </button>
        </div>
      </GlassCard>

      <GlassCard className="table-card">
        <div className="filter-panel">
          <div
            className="search-input-wrapper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: 1
            }}
          >
            <Search
              size={16}
              style={{ color: '#888' }}
            />

            <input
              type="text"
              placeholder="Filter list by receipt number"
              value={search}
              onChange={handleSearchChange}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 14
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="page-loading">
            Loading sales...
          </div>
        ) : sales.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {sales.map(sale => (
                  <tr key={sale._id}>
                    <td>
                      <strong className="mono-text">
                        {sale.receiptNumber ||
                          `Sale #${sale._id.slice(-8)}`}
                      </strong>
                    </td>

                    <td>
                      {dateTime(sale.createdAt)}
                    </td>

                    <td>
                      <strong>
                        {sale.cashier?.fullName || '—'}
                      </strong>

                      <small className="table-subtext">
                        {sale.cashier?.role || ''}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {(sale.items || []).reduce(
                          (sum, item) =>
                            sum +
                            Number(item.quantity || 0),
                          0
                        )}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {peso(sale.totalAmount)}
                      </strong>

                      {Number(
                        sale.refundedAmount || 0
                      ) > 0 && (
                        <small className="table-subtext quantity-negative">
                          Refunded:{' '}
                          {peso(sale.refundedAmount)}
                        </small>
                      )}
                    </td>

                    <td>
                      <span className="movement-pill">
                        {sale.paymentMethod || 'cash'}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`movement-pill movement-${
                          sale.status || 'completed'
                        }`}
                      >
                        {sale.status || 'completed'}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="row-icon"
                          title="View sale details"
                          onClick={() =>
                            openDetails(sale)
                          }
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No sales found"
            description="Completed POS transactions will appear here."
          />
        )}

        {totalPages > 1 && (
          <div className="table-pagination">
            <button
              type="button"
              className="secondary-btn"
              disabled={page <= 1}
              onClick={() =>
                setPage(currentPage =>
                  Math.max(1, currentPage - 1)
                )
              }
            >
              Previous
            </button>

            <span style={{ fontSize: 13 }}>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              className="secondary-btn"
              disabled={page >= totalPages}
              onClick={() =>
                setPage(currentPage =>
                  Math.min(
                    totalPages,
                    currentPage + 1
                  )
                )
              }
            >
              Next
            </button>
          </div>
        )}
      </GlassCard>

      {showReceiptScanner && (
        <ReceiptScannerModal
          onClose={() => setShowReceiptScanner(false)}
          onReceiptDetected={handleReceiptDetected}
        />
      )}

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          account={account}
          onClose={() => {
            setSelectedSale(null);
            load(false);
          }}
        />
      )}
    </div>
  );
}