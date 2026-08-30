import { useState } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';
import { peso } from '../../utils/format';

export default function ReturnSaleModal({ sale, onClose, onSuccess }) {
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addItem(index) {
    const item = sale.items[index];

    setSelected(previous => [
      ...previous,
      {
        saleItemIndex: index,
        quantity: 1,
        condition: 'resellable',
        reason: ''
      }
    ]);
  }

  function removeItem(index) {
    setSelected(previous =>
      previous.filter(item => item.saleItemIndex !== index)
    );
  }

  function updateSelectedItem(index, field, value) {
    setSelected(previous =>
      previous.map(item => {
        if (item.saleItemIndex !== index) return item;

        return {
          ...item,
          [field]: value
        };
      })
    );
  }

  function getSelectedItem(index) {
    return selected.find(item => item.saleItemIndex === index);
  }

  const totalRefund = selected.reduce((total, selectedItem) => {
    const saleItem = sale.items[selectedItem.saleItemIndex];
    const quantity = Number(selectedItem.quantity) || 0;

    return total + quantity * saleItem.unitPrice;
  }, 0);

  async function handleSubmit() {
    if (!selected.length) {
      setError('Select at least one item to return.');
      return;
    }

    if (!reason.trim()) {
      setError('Enter an overall return reason.');
      return;
    }

    const invalidQuantity = selected.some(selectedItem => {
      const saleItem = sale.items[selectedItem.saleItemIndex];
      const quantity = Number(selectedItem.quantity);

      return (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > saleItem.quantity
      );
    });

    if (invalidQuantity) {
      setError('Each return quantity must be between 1 and the sold quantity.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await client.post('/returns', {
        saleId: sale._id,
        reason: reason.trim(),
        items: selected.map(item => ({
          saleItemIndex: item.saleItemIndex,
          quantity: Number(item.quantity),
          condition: item.condition,
          reason: item.reason?.trim() || ''
        }))
      });

      onSuccess?.(response.data);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to process the return.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 980 }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">PROCESS RETURN</p>
            <h3>Sale #{sale._id.slice(-8)}</h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close return form"
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="stock-summary">
          <div>
            <span>Sale date</span>
            <strong>{new Date(sale.createdAt).toLocaleString()}</strong>
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
            <span>Original total</span>
            <strong>{peso(sale.totalAmount)}</strong>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Select returned items</h4>

          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Product</th>
                  <th>Sold qty</th>
                  <th>Return qty</th>
                  <th>Unit price</th>
                  <th>Condition</th>
                  <th>Item reason</th>
                </tr>
              </thead>

              <tbody>
                {(sale.items || []).map((item, index) => {
                  const selectedItem = getSelectedItem(index);

                  return (
                    <tr key={`${item.product?._id || item.name}-${index}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedItem)}
                          disabled={submitting}
                          onChange={event => {
                            if (event.target.checked) {
                              addItem(index);
                            } else {
                              removeItem(index);
                            }
                          }}
                        />
                      </td>

                      <td>
                        <strong>
                          {item.name || item.product?.name || 'Deleted product'}
                        </strong>

                        <small className="table-subtext">
                          {item.barcode || item.product?.barcode || '—'}
                        </small>
                      </td>

                      <td>
                        <strong>{item.quantity}</strong>
                      </td>

                      <td>
                        {selectedItem ? (
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={selectedItem.quantity}
                            disabled={submitting}
                            onChange={event =>
                              updateSelectedItem(
                                index,
                                'quantity',
                                event.target.value
                              )
                            }
                            style={{ width: 76 }}
                          />
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>{peso(item.unitPrice)}</td>

                      <td>
                        {selectedItem ? (
                          <select
                            value={selectedItem.condition}
                            disabled={submitting}
                            onChange={event =>
                              updateSelectedItem(
                                index,
                                'condition',
                                event.target.value
                              )
                            }
                          >
                            <option value="resellable">Resellable</option>
                            <option value="damaged">Damaged</option>
                            <option value="opened">Opened</option>
                            <option value="expired">Expired</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        {selectedItem ? (
                          <input
                            type="text"
                            placeholder="Optional details"
                            value={selectedItem.reason}
                            disabled={submitting}
                            onChange={event =>
                              updateSelectedItem(
                                index,
                                'reason',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          '—'
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
            <span>Overall return reason</span>
            <input
              type="text"
              value={reason}
              disabled={submitting}
              onChange={event => setReason(event.target.value)}
              placeholder="Example: Wrong item purchased"
            />
          </label>
        </div>

        <div className="stock-summary" style={{ marginTop: 16 }}>
          <div>
            <span>Products selected</span>
            <strong>{selected.length}</strong>
          </div>

          <div>
            <span>Total refund</span>
            <strong className="quantity-negative">
              {peso(totalRefund)}
            </strong>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Confirm return'}
          </button>
        </div>
      </div>
    </div>
  );
}