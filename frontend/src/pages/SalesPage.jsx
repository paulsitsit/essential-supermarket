import { useEffect, useState } from 'react';
import { Eye, RefreshCw, Search } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import SaleDetailsModal from '../components/sales/SaleDetailsModal';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { dateTime, peso } from '../utils/format';

export default function SalesPage() {
  const { account } = useAuth();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  async function load(resetPage = false) {
    setLoading(true);
    setError('');

    try {
      const p = resetPage ? 1 : page;
      const params = new URLSearchParams({
        page: String(p),
        limit: String(limit)
      });
      if (search) params.set('search', search);

      const res = await client.get(`/sales?${params.toString()}`);
      const data = res.data;

      setSales(data.sales || []);
      setTotal(data.pagination?.total || 0);
      if (resetPage) setPage(1);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load sales'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function openDetails(sale) {
    setSelectedSale(sale);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SALES</p>
          <h1>Sales</h1>
          <p>Review completed POS transactions and batch details.</p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => load(false)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="form-error page-message">{error}</div>}

      <GlassCard className="table-card">
        <div className="filter-panel">
          <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Search size={16} style={{ color: '#888' }} />
            <input
              type="text"
              placeholder="Search by cashier or reference"
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
        </div>

        {loading ? (
          <div className="page-loading">Loading sales...</div>
        ) : sales.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
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
                    <td>{dateTime(sale.createdAt)}</td>
                    <td>
                      <strong>{sale.cashier?.fullName || '—'}</strong>
                      <small className="table-subtext">
                        {sale.cashier?.role || ''}
                      </small>
                    </td>
                    <td>
                      <strong>{(sale.items || []).length}</strong>
                    </td>
                    <td>
                      <strong>{peso(sale.totalAmount)}</strong>
                    </td>
                    <td>
                      <span className="movement-pill">
                        {sale.paymentMethod || 'cash'}
                      </span>
                    </td>
                    <td>
                      <span className={`movement-pill movement-${sale.status || 'completed'}`}>
                        {sale.status || 'completed'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="row-icon"
                          title="View details"
                          onClick={() => openDetails(sale)}
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
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
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </GlassCard>

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          account={account}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}