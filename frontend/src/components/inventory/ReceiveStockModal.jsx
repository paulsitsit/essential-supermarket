import { useState } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import StatusBadge from '../common/StatusBadge';
import { getErrorMessage } from '../../utils/errors';

const reasons = ['New delivery received', 'Returned stock', 'Branch transfer', 'Inventory correction'];

export default function ReceiveStockModal({ product, onClose, onSaved }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(reasons[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setError('');
    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) return setError('Enter a whole quantity greater than zero.');
    setBusy(true);
    try { await client.post('/stock-movements', { productId: product._id, movementType: 'stock_in', quantityChanged: Number(quantity), reason }); onSaved(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to save stock movement')); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><p className="eyebrow">RECEIVE STOCK</p><h3>{product.name}</h3></div><button className="icon-btn" onClick={onClose}><X size={20} /></button></div><div className="stock-summary"><div><span>Barcode</span><strong>{product.barcode}</strong></div><div><span>SKU</span><strong>{product.sku}</strong></div><div><span>Current stock</span><strong>{product.currentStock} {product.unitType}</strong></div><div><span>Reorder level</span><strong>{product.reorderLevel} {product.unitType}</strong></div><div><span>Status</span><StatusBadge status={product.status} /></div></div>{error && <div className="form-error">{error}</div>}<form onSubmit={submit} className="modal-form"><label>Quantity received<input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" autoFocus /></label><label>Reason<select value={reason} onChange={e => setReason(e.target.value)}>{reasons.map(item => <option key={item}>{item}</option>)}</select></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving...' : 'Save Stock Movement'}</button></div></form></div></div>;
}