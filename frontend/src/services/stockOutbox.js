import {
  getStockSyncErrorMessage,
  isStockSyncConflict,
  isStockSyncRetryable,
  syncStockReceiveDraft
} from './stockSync.js';

const STORAGE_KEY =
  'essential-supermarket-stock-outbox';

const listeners = new Set();

function createDraftId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `stock-draft-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function readOutbox() {
  try {
    const raw = localStorage.getItem(
      STORAGE_KEY
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          draft =>
            draft &&
            typeof draft === 'object' &&
            draft.id &&
            draft.receipt
        )
      : [];
  } catch (error) {
    console.error(
      'Unable to read offline stock receipts:',
      error
    );

    return [];
  }
}

function notifyListeners() {
  const drafts = readOutbox();

  listeners.forEach(listener => {
    try {
      listener(drafts);
    } catch (error) {
      console.error(
        'Stock receipt outbox listener failed:',
        error
      );
    }
  });
}

function writeOutbox(drafts) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(drafts)
  );

  notifyListeners();
}

function validateReceipt(receipt = {}) {
  const productId = String(
    receipt.productId || ''
  ).trim();

  const quantity = Number(
    receipt.quantity
  );

  const reason = String(
    receipt.reason || ''
  ).trim();

  const batchNumber = String(
    receipt.batchNumber || ''
  ).trim();

  const receivedDate = String(
    receipt.receivedDate || ''
  ).trim();

  if (!productId) {
    throw new Error(
      'A product is required to save an offline stock receipt.'
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      'Received quantity must be a whole number greater than zero.'
    );
  }

  if (!reason) {
    throw new Error(
      'A stock receipt reason is required.'
    );
  }

  if (!batchNumber) {
    throw new Error(
      'A batch or lot number is required for an offline stock receipt.'
    );
  }

  if (!receivedDate) {
    throw new Error(
      'Received date is required.'
    );
  }

  return {
    productId,
    quantity,
    reason,
    batchNumber,
    receivedDate,
    expirationDate:
      receipt.expirationDate || null
  };
}

export function savePendingStockReceipt({
  product,
  receipt
}) {
  const normalizedReceipt =
    validateReceipt(receipt);

  const drafts = readOutbox();

  const now = new Date().toISOString();

  const draft = {
    id: createDraftId(),

    operationId: null,

    status: 'pending',

    errorMessage: '',

    product: {
      id:
        product?._id ||
        product?.id ||
        normalizedReceipt.productId,

      name:
        product?.name ||
        'Unknown product',

      barcode:
        product?.barcode || '',

      sku: product?.sku || '',

      unitType:
        product?.unitType || 'piece'
    },

    receipt: normalizedReceipt,

    createdAt: now,

    updatedAt: now
  };

  writeOutbox([
    draft,
    ...drafts
  ]);

  return draft;
}

export function getPendingStockReceipts() {
  return readOutbox();
}

export function getPendingStockReceiptCount() {
  return readOutbox().filter(
    draft =>
      draft.status === 'pending' ||
      draft.status === 'retryable'
  ).length;
}

export function subscribeToStockOutbox(
  listener
) {
  listeners.add(listener);

  listener(readOutbox());

  return () => {
    listeners.delete(listener);
  };
}

export function removeStockReceiptDraft(
  draftId
) {
  writeOutbox(
    readOutbox().filter(
      draft => draft.id !== draftId
    )
  );
}

export function clearCompletedStockReceipts() {
  writeOutbox(
    readOutbox().filter(
      draft =>
        draft.status !== 'synced' &&
        draft.status !== 'discarded'
    )
  );
}

function updateStockReceiptDraft(
  draftId,
  updates
) {
  const drafts = readOutbox();

  const index = drafts.findIndex(
    draft => draft.id === draftId
  );

  if (index === -1) {
    return null;
  }

  drafts[index] = {
    ...drafts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeOutbox(drafts);

  return drafts[index];
}

async function syncOneStockReceipt(draft) {
  updateStockReceiptDraft(draft.id, {
    status: 'syncing',
    errorMessage: ''
  });

  try {
    const result =
      await syncStockReceiveDraft({
        operationId: draft.operationId,
        receipt: draft.receipt
      });

    updateStockReceiptDraft(draft.id, {
      status: 'synced',
      operationId: result.operationId,
      errorMessage: ''
    });

    return {
      draftId: draft.id,
      success: true,
      replayed: result.replayed,
      product: result.product,
      batch: result.batch,
      movement: result.movement
    };
  } catch (error) {
    const conflict =
      isStockSyncConflict(error);

    const retryable =
      isStockSyncRetryable(error);

    updateStockReceiptDraft(draft.id, {
      status: conflict
        ? 'conflict'
        : retryable
          ? 'retryable'
          : 'failed',

      errorMessage:
        getStockSyncErrorMessage(error)
    });

    return {
      draftId: draft.id,
      success: false,
      conflict,
      retryable,
      error
    };
  }
}

export async function syncPendingStockReceipts() {
  const drafts = readOutbox().filter(
    draft =>
      draft.status === 'pending' ||
      draft.status === 'retryable'
  );

  if (!drafts.length) {
    return {
      synced: 0,
      failed: 0,
      conflicts: 0,
      results: []
    };
  }

  const results = [];

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const draft of drafts) {
    const result =
      await syncOneStockReceipt(draft);

    results.push(result);

    if (result.success) {
      synced += 1;
    } else if (result.conflict) {
      conflicts += 1;
    } else {
      failed += 1;
    }
  }

  return {
    synced,
    failed,
    conflicts,
    results
  };
}

export function hasSyncableStockReceipts() {
  return readOutbox().some(
    draft =>
      draft.status === 'pending' ||
      draft.status === 'retryable'
  );
}