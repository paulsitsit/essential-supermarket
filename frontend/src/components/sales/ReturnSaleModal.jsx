import { useState } from 'react';
import { X } from 'lucide-react';
import { peso } from '../../utils/format';

export default function ReturnSaleModal({ sale, onClose, onSuccess }) {
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleItem(idx, condition) {
    setSelected(prev => {
      const exists = prev.find(s => s.saleItemIndex === idx);
      if (exists) {
        return prev.filter(s => s.saleItemIndex !== idx);
      }
      const item = sale.items[idx];
      return [...prev, { saleItemIndex: idx, quantity: 1, condition, reason: '' }];
    });
  }

  function updateSelection(idx, field, value) {
    setSelected(prev => prev.map(s => (s.saleItemIndex === idx ? { ...s, [field]: value } : s)));
  }

  const totalRefund = selected.reduce((sum, s) => {
    const item = sale.items[s.saleItemIndex];
    return sum + s.quantity * item.unitPrice;
  }, 0);

  async function handleSubmit() {
    if (selected.length === 0) return setError('Select at least one item');
    if (!reason.trim()) return setError('Provide a return reason');
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ saleId: sale._id, items: selected, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Return failed');
      onSuccess?.(data);
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 900 }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">PROCESS RETURN</p>
            <h3>Sale #{sale._id.slice(-8)}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="stock-summary">
          <div>
            <span>Date</span>
            <strong>{new Date(sale.createdAt).toLocaleString()}</strong>
          </div>
          <div>
            <span>Cashier</span>
            <strong>{sale.cashier?.fullName || '—'}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>{sale.paymentMethod}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{peso(sale.totalAmount)}</strong>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Items</h4>
          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Subtotal</th>
                  <th>Condition</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => {
                  const sel = selected.find(s => s.saleItemIndex === idx);
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={e => {
                            if (e.target.checked) toggleItem(idx, 'resellable');
                            else setSelected(prev => prev.filter(s => s.saleItemIndex !== idx));
                          }}
                        />
                      </td>
                      <td>
                        <strong>{item.name}</strong>
                        <small className="table-subtext">{item.barcode || '—'}</small>
                      </td>
                      <td>
                        {sel ? (
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={sel.quantity}
                            onChange={e => updateSelection(idx, 'quantity', Number(e.target.value))}
                            style={{ width: 60 }}
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td>{peso(item.unitPrice)}</td>
                      <td>{peso(item.subtotal)}</td>
                      <td>
                        {sel && (
                          <select
                            value={sel.condition}
                            onChange={e => updateSelection(idx, 'condition', e.target.value)}
                          >
                            <option value="resellable">Resellable</option>
                            <option value="damaged">Damaged</option>
                            <option value="opened">Opened</option>
                            <option value="expired">Expired</option>
                            <option value="other">Other</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {sel && (
                          <input
                            type="text"
                            placeholder="Optional"
                            value={sel.reason || ''}
                            onChange={e => updateSelection(idx, 'reason', e.target.value)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-form">
          <label>
            <span>Return reason</span>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Wrong item, customer changed mind"
            />
          </label>
        </div>

        <div className="stock-summary" style={{ marginTop: 16 }}>
          <div>
            <span>Items selected</span>
            <strong>{selected.length}</strong>
          </div>
          <div>
            <span>Total refund</span>
            <strong className="quantity-negative">{peso(totalRefund)}</strong>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm return'}
          </button>
        </div>
      </div>
    </div>
  );
}