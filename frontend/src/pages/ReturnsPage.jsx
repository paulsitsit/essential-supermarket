import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { dateTime, peso } from '../utils/format';
import EmptyState from '../components/common/EmptyState';
import LoadingScreen from '../components/common/LoadingScreen';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function ReturnsPage({ account }) {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    const url = saleId ? `${API}/returns?saleId=${saleId}` : `${API}/returns`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => {
        setReturns(data.returns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [saleId]);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RETURNS</p>
          <h1>{saleId ? 'Sale returns' : 'All returns'}</h1>
        </div>
        <div className="heading-actions">
          <button className="secondary-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      {returns.length === 0 ? (
        <EmptyState title="No returns yet" description="This sale has no customer returns." />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sale</th>
                  <th>Items</th>
                  <th>Refund</th>
                  <th>Processed by</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(ret => (
                  <tr key={ret._id}>
                    <td>{dateTime(ret.createdAt)}</td>
                    <td>
                      <strong>#{ret.sale?.saleNumber?.slice(-8) || '—'}</strong>
                    </td>
                    <td>{ret.items?.length || 0}</td>
                    <td className="quantity-negative">{peso(ret.totalRefund)}</td>
                    <td>{ret.processedBy?.fullName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}