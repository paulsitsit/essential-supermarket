import api from './api.js';

function createOperationId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function normalizeDraftPayload(draft = {}) {
  const allowed = [
    'name',
    'barcode',
    'sku',
    'qrCode',
    'category',
    'supplier',
    'brand',
    'description',
    'imageUrl',
    'unitType',
    'branch',
    'reorderLevel',
    'costPrice',
    'sellingPrice'
  ];

  const payload = {};

  allowed.forEach(field => {
    if (
      draft[field] !== undefined &&
      draft[field] !== null
    ) {
      payload[field] = draft[field];
    }
  });

  return payload;
}

export async function syncProductDraft({
  operationId,
  kind,
  productId,
  baseSyncVersion,
  draft
}) {
  const normalizedOperationId =
    String(operationId || '').trim() ||
    createOperationId();

  const response = await api.post(
    '/products/sync',
    {
      operationId: normalizedOperationId,
      kind,
      productId,
      baseSyncVersion,
      payload: normalizeDraftPayload(draft)
    }
  );

  return {
    operationId: normalizedOperationId,
    replayed: Boolean(
      response.data?.replayed
    ),
    product: response.data?.product || null
  };
}

export async function syncCreatedProductDraft({
  operationId,
  draft
}) {
  return syncProductDraft({
    operationId,
    kind: 'create',
    draft
  });
}

export async function syncUpdatedProductDraft({
  operationId,
  productId,
  baseSyncVersion,
  draft
}) {
  return syncProductDraft({
    operationId,
    kind: 'update',
    productId,
    baseSyncVersion,
    draft
  });
}

export function isOfflineSyncConflict(error) {
  return (
    error?.response?.data?.code ===
      'PRODUCT_SYNC_CONFLICT' ||
    error?.response?.status === 409
  );
}

export function getOfflineSyncErrorMessage(
  error
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to synchronize this product draft.'
  );
}

export function isOfflineSyncRetryable(
  error
) {
  return Boolean(
    error?.response?.data?.retryable
  );
}