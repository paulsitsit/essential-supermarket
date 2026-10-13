import client from '../api/client.js';

function createOperationId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `stock-receive-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function normalizeReceiptPayload(receipt = {}) {
  return {
    productId: String(
      receipt.productId || ''
    ).trim(),

    quantity: Number(receipt.quantity || 0),

    reason: String(
      receipt.reason || ''
    ).trim(),

    batchNumber: String(
      receipt.batchNumber || ''
    ).trim(),

    receivedDate: String(
      receipt.receivedDate || ''
    ).trim(),

    expirationDate:
      receipt.expirationDate
        ? String(
            receipt.expirationDate
          ).trim()
        : null
  };
}

export async function syncStockReceiveDraft({
  operationId,
  receipt
}) {
  const normalizedOperationId =
    String(operationId || '').trim() ||
    createOperationId();

  const response = await client.post(
    '/batches/sync-receive',
    {
      operationId: normalizedOperationId,
      payload: normalizeReceiptPayload(
        receipt
      )
    }
  );

  return {
    operationId: normalizedOperationId,
    replayed: Boolean(
      response.data?.replayed
    ),
    product: response.data?.product || null,
    batch: response.data?.batch || null,
    movement: response.data?.movement || null
  };
}

export function isStockSyncConflict(error) {
  return (
    error?.response?.status === 409 ||
    error?.response?.data?.code ===
      'STOCK_SYNC_CONFLICT'
  );
}

export function isStockSyncRetryable(error) {
  return Boolean(
    error?.response?.data?.retryable
  );
}

export function getStockSyncErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to synchronize the stock receipt.'
  );
}