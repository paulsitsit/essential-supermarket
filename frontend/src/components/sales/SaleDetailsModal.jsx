import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { dateTime, peso, dateOnly } from '../../utils/format';
import EmptyState from '../common/EmptyState';
import ReturnSaleModal from './ReturnSaleModal';

export default function SaleDetailsModal({ sale, onClose, account }) {
  const [showReturn, setShowReturn] = useState(false);

  if (!sale) return null;

  const canProcessReturn = ['admin', 'manager'].includes(account?.role);

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal-card" style={{ maxWidth: 900 }}>
          <div className="modal-header">
            <div>
              <p className="eyebrow">SALE DETAILS</p>
              <h3>Sale #{sale._id.slice(-8)}</h3>
            </div>

            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close sale details">
              <X size={20} />
            </button>
          </div>

          <div className="stock-summary" style={{ marginBottom: 12 }}>
            <div>
              <span>Date</span>
              <strong>{dateTime(sale.createdAt)}</strong>
            </div>
            <div>
              <span>Cashier</span>
              <strong>{sale.cashier?.fullName || '—'}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{sale.paymentMethod || 'cash'}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{peso(sale.totalAmount)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{sale.status || 'completed'}</strong>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 8 }}>Items</h4>

            <div className="table-wrap">
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(sale.items || []).map((item, idx) => (
                    <tr key={`${item.product?._id || idx}`}>
                      <td>
                        <strong>{item.name || item.product?.name || 'Deleted product'}</strong>
                        <small className="table-subtext" style={{ fontSize: 11 }}>
                          {item.barcode || item.product?.barcode || '—'}
                        </small>
                      </td>
                      <td>
                        <strong>{item.quantity}</strong>
                      </td>
                      <td>{peso(item.unitPrice)}</td>
                      <td>{peso(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: 8 }}>Batch allocations</h4>

            {(sale.items || []).some(item => (item.batchAllocations || []).length > 0) ? (
              <div className="table-wrap">
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch number</th>
                      <th>Expiry</th>
                      <th>Qty from batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).flatMap((item, itemIdx) => {
                      const allocs = item.batchAllocations || [];
                      if (!allocs.length) return [];

                      return allocs.map((alloc, allocIdx) => {
                        const batch = alloc.batch || {};
                        return (
                          <tr key={`${itemIdx}-${allocIdx}`}>
                            <td>
                              <strong>{item.name || item.product?.name || 'Deleted product'}</strong>
                              <small className="table-subtext" style={{ fontSize: 11 }}>
                                {item.barcode || item.product?.barcode || '—'}
                              </small>
                            </td>
                            <td>
                              <strong className="mono-text">
                                {batch.batchNumber || alloc.batchNumber || '—'}
                              </strong>
                            </td>
                            <td>
                              {batch.expirationDate || alloc.expirationDate
                                ? dateOnly(batch.expirationDate || alloc.expirationDate)
                                : 'No expiry'}
                            </td>
                            <td>
                              <strong>{alloc.quantity}</strong>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No batch allocations" description="This sale does not have batch-level details." />
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            {canProcessReturn && (
              <button type="button" className="secondary-btn" onClick={() => setShowReturn(true)}>
                <RotateCcw size={16} />
                Process return
              </button>
            )}

            <button type="button" className="secondary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {showReturn && (
        <ReturnSaleModal
          sale={sale}
          onClose={() => setShowReturn(false)}
          onSuccess={() => {
            setShowReturn(false);
            onClose();
          }}
        />
      )}
    </>
  );
}