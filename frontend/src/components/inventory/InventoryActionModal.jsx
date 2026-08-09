import { useState } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';

const actions = { stock_adjustment: 'Stock Adjustment', damaged: 'Damaged Stock', expired: 'Expired Stock', returned_to_supplier: 'Returned to Supplier', branch_transfer: 'Branch Transfer' };

export default function InventoryActionModal({ product, type = 'stock_adjustment', onClose, onSaved }) {
  const [quantity, setQuantity] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) { event.preventDefault(); if (!Number(quantity) || Number(quantity) <= 0) return setError('Enter a quantity greater than zero.'); if (!reason.trim()) return setError('Enter a reason.'); setBusy(true); try { const signedQuantity = ['damaged', 'expired', 'returned_to_supplier'].includes(type) ? -Math.abs(Number(quantity)) : Number(quantity); await client.post('/stock-movements', { productId: product._id, movementType: type, quantityChanged: signedQuantity, reason }); onSaved(); } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); } }
  return <div className="modal-backdrop"><div className="modal-card compact-modal"><div className="modal-header"><div><p className="eyebrow">INVENTORY ACTION</p><h3>{actions[type]}</h3><p>{product.name} · Current stock: {product.currentStock} {product.unitType}</p></div><button className="icon-btn" onClick={onClose}><X size={20} /></button></div>{error && <div className="form-error">{error}</div>}<form className="modal-form" onSubmit={submit}><label>Quantity<input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Reason<textarea rows="3" value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain this inventory action" /></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving...' : 'Save movement'}</button></div></form></div></div>;
}