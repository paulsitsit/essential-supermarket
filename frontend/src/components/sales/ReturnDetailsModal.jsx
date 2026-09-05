import { useEffect, useState } from 'react';
import {
  AlertCircle,
  LoaderCircle,
  PackageCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import client from '../../api/client';
import EmptyState from '../common/EmptyState';
import { getErrorMessage } from '../../utils/errors';
import {
  dateOnly,
  dateTime,
  peso
} from '../../utils/format';

function getReturnReference(returnRecord) {
  const id = String(returnRecord?._id || '');

  return id
    ? `RTN-${id.slice(-8).toUpperCase()}`
    : '—';
}

function readableCondition(condition) {
  return String(condition || 'other')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character =>
      character.toUpperCase()
    );
}

function conditionClass(condition) {
  const value = String(condition || '');

  if (value === 'resellable') {
    return 'movement-pill movement-completed';
  }

  if (value === 'damaged') {
    return 'movement-pill movement-expired';
  }

  if (
    value === 'opened' ||
    value === 'expired'
  ) {
    return 'movement-pill movement-stockadjustment';
  }

  return 'movement-pill';
}

function getDestination(item) {
  if (item?.condition === 'resellable') {
    return {
      label: 'Restocked to inventory',
      icon: PackageCheck,
      className: 'quantity-positive'
    };
  }

  return {
    label: 'Sent to quarantine',
    icon: ShieldAlert,
    className: 'quantity-negative'
  };
}

export default function ReturnDetailsModal({
  returnId,
  onClose
}) {
  const [returnRecord, setReturnRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReturn() {
      setLoading(true);
      setError('');

      try {
        const response = await client.get(
          `/returns/${returnId}`
        );

        if (active) {
          setReturnRecord(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              'Unable to load return details.'
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReturn();

    return () => {
      active = false;
    };
  }, [returnId]);

  const originalSale =
    returnRecord?.originalSale || null;

  const items = returnRecord?.items || [];

  const totalReturnedQuantity = items.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
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
              RETURN DETAILS
            </p>

            <h3>
              {returnRecord
                ? getReturnReference(returnRecord)
                : 'Loading return...'}
            </h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close return details"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="page-loading">
            <LoaderCircle
              size={20}
              className="spin-icon"
            />
            Loading return details...
          </div>
        ) : error ? (
          <div className="form-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : !returnRecord ? (
          <EmptyState
            title="Return not found"
            description="This return record may have been deleted or is unavailable."
          />
        ) : (
          <>
            <div className="stock-summary">
              <div>
                <span>Return date</span>
                <strong>
                  {dateTime(returnRecord.createdAt)}
                </strong>
              </div>

              <div>
                <span>Original receipt</span>
                <strong className="mono-text">
                  {returnRecord.saleReference || '—'}
                </strong>
              </div>

              <div>
                <span>Processed by</span>
                <strong>
                  {returnRecord.processedBy?.fullName ||
                    '—'}
                </strong>
              </div>

              <div>
                <span>Items returned</span>
                <strong>
                  {totalReturnedQuantity}
                </strong>
              </div>

              <div>
                <span>This refund</span>
                <strong className="quantity-negative">
                  {peso(returnRecord.totalRefund)}
                </strong>
              </div>

              <div>
                <span>Return reason</span>
                <strong>
                  {returnRecord.reason || '—'}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-heading">
                <div>
                  <h4>Original sale</h4>
                  <p>
                    Original POS transaction and current
                    refund totals.
                  </p>
                </div>
              </div>

              <div className="stock-summary">
                <div>
                  <span>Sale date</span>
                  <strong>
                    {originalSale?.date
                      ? dateTime(originalSale.date)
                      : '—'}
                  </strong>
                </div>

                <div>
                  <span>Cashier</span>
                  <strong>
                    {originalSale?.cashier?.fullName ||
                      '—'}
                  </strong>
                </div>

                <div>
                  <span>Original total</span>
                  <strong>
                    {peso(
                      originalSale?.totalAmount || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Total refunded</span>
                  <strong className="quantity-negative">
                    {peso(
                      originalSale?.refundedAmount || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Net sale</span>
                  <strong>
                    {peso(
                      originalSale?.netAmount || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Sale status</span>
                  <strong>
                    {String(
                      originalSale?.status || 'completed'
                    ).replaceAll('_', ' ')}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-heading">
                <div>
                  <h4>Returned products</h4>
                  <p>
                    Product condition determines whether
                    stock was restored or moved to quarantine.
                  </p>
                </div>
              </div>

              {items.length ? (
                <div className="table-wrap">
                  <table
                    className="data-table"
                    style={{ fontSize: 13 }}
                  >
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Barcode</th>
                        <th>Returned qty</th>
                        <th>Unit price</th>
                        <th>Refund</th>
                        <th>Condition</th>
                        <th>Destination</th>
                        <th>Item reason</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, index) => {
                        const destination =
                          getDestination(item);

                        const DestinationIcon =
                          destination.icon;

                        return (
                          <tr
                            key={
                              item._id ||
                              `${item.product}-${index}`
                            }
                          >
                            <td>
                              <strong>
                                {item.name ||
                                  item.product?.name ||
                                  'Deleted product'}
                              </strong>
                            </td>

                            <td>
                              <span className="mono-text">
                                {item.barcode ||
                                  item.product?.barcode ||
                                  '—'}
                              </span>
                            </td>

                            <td>
                              <strong>
                                {item.quantity}
                              </strong>
                            </td>

                            <td>
                              {peso(item.unitPrice)}
                            </td>

                            <td className="quantity-negative">
                              {peso(item.subtotal)}
                            </td>

                            <td>
                              <span
                                className={conditionClass(
                                  item.condition
                                )}
                              >
                                {readableCondition(
                                  item.condition
                                )}
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  destination.className
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontWeight: 700
                                }}
                              >
                                <DestinationIcon size={15} />
                                {destination.label}
                              </span>
                            </td>

                            <td>
                              {item.reason || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No returned products"
                  description="This return record does not contain item details."
                />
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-heading">
                <div>
                  <h4>Original batch allocations</h4>
                  <p>
                    Batches connected to the returned
                    products.
                  </p>
                </div>
              </div>

              {items.some(
                item =>
                  (item.batchAllocations || []).length > 0
              ) ? (
                <div className="table-wrap">
                  <table
                    className="data-table"
                    style={{ fontSize: 13 }}
                  >
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Batch number</th>
                        <th>Expiry date</th>
                        <th>Returned from batch</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.flatMap((item, itemIndex) =>
                        (item.batchAllocations || []).map(
                          (allocation, allocationIndex) => (
                            <tr
                              key={`${itemIndex}-${allocationIndex}`}
                            >
                              <td>
                                <strong>
                                  {item.name ||
                                    'Deleted product'}
                                </strong>
                              </td>

                              <td>
                                <strong className="mono-text">
                                  {allocation.batchNumber ||
                                    allocation.batch?.batchNumber ||
                                    '—'}
                                </strong>
                              </td>

                              <td>
                                {allocation.expirationDate ||
                                allocation.batch
                                  ?.expirationDate
                                  ? dateOnly(
                                      allocation.expirationDate ||
                                        allocation.batch
                                          ?.expirationDate
                                    )
                                  : 'No expiry'}
                              </td>

                              <td>
                                <strong>
                                  {allocation.quantity}
                                </strong>
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No batch allocation information"
                  description="No batch-level allocation data was saved for this return."
                />
              )}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}