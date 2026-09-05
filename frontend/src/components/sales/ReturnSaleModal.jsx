import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X
} from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';
import { peso } from '../../utils/format';

function quantityBadgeClass(value) {
  if (value <= 0) {
    return 'quantity-negative';
  }

  return 'quantity-positive';
}

export default function ReturnSaleModal({
  sale,
  onClose,
  onSuccess
}) {
  const [balanceData, setBalanceData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadBalance() {
    if (!sale?._id) {
      return;
    }

    setLoadingBalance(true);
    setError('');

    try {
      const response = await client.get(
        `/returns/sale/${sale._id}/balance`
      );

      const data = response.data;

      setBalanceData(data);

      setSelected(previous =>
        previous.filter(selectedItem => {
          const balanceItem = (data.items || []).find(
            item =>
              item.saleItemIndex ===
              selectedItem.saleItemIndex
          );

          return balanceItem?.remainingReturnable > 0;
        })
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load returnable item quantities.'
        )
      );
    } finally {
      setLoadingBalance(false);
    }
  }

  useEffect(() => {
    loadBalance();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?._id]);

  const balanceItems = balanceData?.items || [];

  function getBalanceItem(index) {
    return balanceItems.find(
      item => item.saleItemIndex === index
    );
  }

  function getSelectedItem(index) {
    return selected.find(
      item => item.saleItemIndex === index
    );
  }

  function addItem(balanceItem) {
    if (
      !balanceItem ||
      Number(balanceItem.remainingReturnable || 0) <= 0
    ) {
      return;
    }

    setSelected(previous => {
      const alreadySelected = previous.some(
        item =>
          item.saleItemIndex ===
          balanceItem.saleItemIndex
      );

      if (alreadySelected) {
        return previous;
      }

      return [
        ...previous,
        {
          saleItemIndex: balanceItem.saleItemIndex,
          quantity: '1',
          condition: 'resellable',
          reason: ''
        }
      ];
    });
  }

  function removeItem(index) {
    setSelected(previous =>
      previous.filter(
        item => item.saleItemIndex !== index
      )
    );
  }

  function updateSelectedItem(index, field, value) {
    setSelected(previous =>
      previous.map(item => {
        if (item.saleItemIndex !== index) {
          return item;
        }

        if (field !== 'quantity') {
          return {
            ...item,
            [field]: value
          };
        }

        /*
         * Allow the field to be blank while the user is editing.
         *
         * Example:
         * Current value: 1
         * User deletes it: ''
         * User types: 50
         *
         * Validation still happens when input loses focus
         * and again when Confirm return is clicked.
         */
        if (value === '') {
          return {
            ...item,
            quantity: ''
          };
        }

        /*
         * Only whole-number typed values are accepted.
         * HTML number inputs can still provide values such as
         * "2.5", "-", or "e", so protect the state here.
         */
        if (!/^\d+$/.test(value)) {
          return item;
        }

        const requestedQuantity = Number(value);
        const balanceItem = getBalanceItem(index);
        const maximumQuantity = Number(
          balanceItem?.remainingReturnable || 0
        );

        if (
          !Number.isInteger(requestedQuantity) ||
          requestedQuantity < 0
        ) {
          return item;
        }

        /*
         * Do not force a minimum of 1 while typing.
         * The onBlur handler and submit validation will
         * correct 0 or blank values safely.
         */
        return {
          ...item,
          quantity:
            maximumQuantity > 0
              ? String(
                  Math.min(
                    requestedQuantity,
                    maximumQuantity
                  )
                )
              : ''
        };
      })
    );
  }

  function correctQuantityOnBlur(index) {
    const selectedItem = getSelectedItem(index);
    const balanceItem = getBalanceItem(index);

    if (!selectedItem || !balanceItem) {
      return;
    }

    const currentQuantity = Number(
      selectedItem.quantity
    );

    const maximumQuantity = Number(
      balanceItem.remainingReturnable || 0
    );

    const correctedQuantity =
      Number.isInteger(currentQuantity) &&
      currentQuantity >= 1
        ? Math.min(
            currentQuantity,
            maximumQuantity
          )
        : 1;

    updateSelectedItem(
      index,
      'quantity',
      String(correctedQuantity)
    );
  }

  const totalRefund = useMemo(() => {
    return selected.reduce((total, selectedItem) => {
      const balanceItem = getBalanceItem(
        selectedItem.saleItemIndex
      );

      if (!balanceItem) {
        return total;
      }

      const quantity = Number(
        selectedItem.quantity
      );

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return total;
      }

      return (
        total +
        quantity * Number(balanceItem.unitPrice || 0)
      );
    }, 0);
  }, [selected, balanceItems]);

  async function handleSubmit() {
    if (loadingBalance) {
      setError(
        'Please wait for return balances to load.'
      );
      return;
    }

    if (!selected.length) {
      setError('Select at least one item to return.');
      return;
    }

    if (!reason.trim()) {
      setError('Enter an overall return reason.');
      return;
    }

    const invalidItem = selected.find(selectedItem => {
      const balanceItem = getBalanceItem(
        selectedItem.saleItemIndex
      );

      const quantity = Number(selectedItem.quantity);

      return (
        !balanceItem ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity >
          Number(balanceItem.remainingReturnable || 0)
      );
    });

    if (invalidItem) {
      const balanceItem = getBalanceItem(
        invalidItem.saleItemIndex
      );

      setError(
        `${balanceItem?.name || 'Selected item'}: enter a whole-number quantity between 1 and ${
          balanceItem?.remainingReturnable || 0
        }.`
      );

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
      setError(
        getErrorMessage(
          err,
          'Unable to process the return.'
        )
      );

      await loadBalance();
    } finally {
      setSubmitting(false);
    }
  }

  const saleInfo = balanceData?.sale || sale;

  const allItemsFullyReturned =
    balanceItems.length > 0 &&
    balanceItems.every(
      item =>
        Number(item.remainingReturnable || 0) <= 0
    );

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card"
        style={{ maxWidth: 1080 }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              PROCESS RETURN
            </p>

            <h3>
              {saleInfo?.reference ||
                saleInfo?.receiptNumber ||
                sale?.receiptNumber ||
                `Sale #${sale._id
                  .slice(-8)
                  .toUpperCase()}`}
            </h3>
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
            <strong>
              {saleInfo?.createdAt
                ? new Date(
                    saleInfo.createdAt
                  ).toLocaleString()
                : '—'}
            </strong>
          </div>

          <div>
            <span>Cashier</span>
            <strong>
              {saleInfo?.cashier?.fullName ||
                sale.cashier?.fullName ||
                '—'}
            </strong>
          </div>

          <div>
            <span>Payment</span>
            <strong>
              {saleInfo?.paymentMethod ||
                sale.paymentMethod ||
                'cash'}
            </strong>
          </div>

          <div>
            <span>Original total</span>
            <strong>
              {peso(
                saleInfo?.totalAmount ||
                  sale.totalAmount
              )}
            </strong>
          </div>

          <div>
            <span>Previously refunded</span>
            <strong className="quantity-negative">
              {peso(saleInfo?.refundedAmount || 0)}
            </strong>
          </div>

          <div>
            <span>Current net sale</span>
            <strong>
              {peso(
                saleInfo?.netAmount ??
                  saleInfo?.totalAmount ??
                  sale.totalAmount
              )}
            </strong>
          </div>
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <h4 style={{ marginBottom: 8 }}>
            Select products to return
          </h4>

          {loadingBalance ? (
            <div className="page-loading">
              <LoaderCircle
                size={18}
                className="spin-icon"
              />
              Loading returnable item quantities...
            </div>
          ) : (
            <div className="table-wrap">
              <table
                className="data-table"
                style={{ fontSize: 13 }}
              >
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Product</th>
                    <th>Sold</th>
                    <th>Returned</th>
                    <th>Available</th>
                    <th>Return qty</th>
                    <th>Unit price</th>
                    <th>Condition</th>
                    <th>Item reason</th>
                  </tr>
                </thead>

                <tbody>
                  {balanceItems.map(balanceItem => {
                    const selectedItem = getSelectedItem(
                      balanceItem.saleItemIndex
                    );

                    const unavailable =
                      Number(
                        balanceItem.remainingReturnable || 0
                      ) <= 0;

                    return (
                      <tr
                        key={`${balanceItem.product}-${balanceItem.saleItemIndex}`}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedItem)}
                            disabled={
                              submitting || unavailable
                            }
                            onChange={event => {
                              if (event.target.checked) {
                                addItem(balanceItem);
                              } else {
                                removeItem(
                                  balanceItem.saleItemIndex
                                );
                              }
                            }}
                          />
                        </td>

                        <td>
                          <strong>
                            {balanceItem.name ||
                              'Deleted product'}
                          </strong>

                          <small className="table-subtext">
                            {balanceItem.barcode || '—'}
                          </small>

                          {unavailable && (
                            <small
                              className="table-subtext"
                              style={{
                                color: '#b91c1c',
                                fontWeight: 700
                              }}
                            >
                              Fully returned
                            </small>
                          )}
                        </td>

                        <td>
                          <strong>
                            {balanceItem.soldQuantity}
                          </strong>
                        </td>

                        <td>
                          <strong className="quantity-negative">
                            {balanceItem.returnedQuantity}
                          </strong>
                        </td>

                        <td>
                          <strong
                            className={quantityBadgeClass(
                              Number(
                                balanceItem.remainingReturnable || 0
                              )
                            )}
                          >
                            {balanceItem.remainingReturnable}
                          </strong>
                        </td>

                        <td>
                          {selectedItem ? (
                            <input
                              type="number"
                              min="1"
                              max={
                                balanceItem.remainingReturnable
                              }
                              step="1"
                              inputMode="numeric"
                              value={selectedItem.quantity}
                              disabled={submitting}
                              onChange={event =>
                                updateSelectedItem(
                                  balanceItem.saleItemIndex,
                                  'quantity',
                                  event.target.value
                                )
                              }
                              onBlur={() =>
                                correctQuantityOnBlur(
                                  balanceItem.saleItemIndex
                                )
                              }
                              style={{ width: 76 }}
                            />
                          ) : unavailable ? (
                            'Fully returned'
                          ) : (
                            '—'
                          )}
                        </td>

                        <td>
                          {peso(balanceItem.unitPrice)}
                        </td>

                        <td>
                          {selectedItem ? (
                            <select
                              value={
                                selectedItem.condition
                              }
                              disabled={submitting}
                              onChange={event =>
                                updateSelectedItem(
                                  balanceItem.saleItemIndex,
                                  'condition',
                                  event.target.value
                                )
                              }
                            >
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
                                  balanceItem.saleItemIndex,
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
          )}
        </div>

        {!loadingBalance && allItemsFullyReturned && (
          <div className="success-message">
            <CheckCircle2 size={16} />
            All items from this sale have already been returned.
          </div>
        )}

        <div className="modal-form">
          <label>
            <span>Overall return reason *</span>

            <input
              type="text"
              value={reason}
              disabled={submitting || loadingBalance}
              onChange={event =>
                setReason(event.target.value)
              }
              placeholder="Example: Wrong item purchased"
            />
          </label>
        </div>

        <div
          className="stock-summary"
          style={{ marginTop: 16 }}
        >
          <div>
            <span>Products selected</span>
            <strong>{selected.length}</strong>
          </div>

          <div>
            <span>Total refund</span>
            <strong className="quantity-negative">
              {peso(totalRefund)}
            </strong>

            <small
              style={{
                display: 'block',
                marginTop: 4,
                color: '#64748b',
                fontSize: 11,
                fontWeight: 400
              }}
            >
              Refunds are calculated from selected
              products and quantities.
            </small>
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
            disabled={
              submitting ||
              loadingBalance ||
              allItemsFullyReturned
            }
          >
            {submitting
              ? 'Processing...'
              : 'Confirm return'}
          </button>
        </div>
      </div>
    </div>
  );
}