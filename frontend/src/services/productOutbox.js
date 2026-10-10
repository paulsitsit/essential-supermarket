import {
  syncCreatedProductDraft,
  syncUpdatedProductDraft,
  isOfflineSyncConflict,
  getOfflineSyncErrorMessage,
  isOfflineSyncRetryable
} from './productSync.js';

const STORAGE_KEY =
  'essential-supermarket-product-outbox';

const listeners = new Set();

function readOutbox() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      'Unable to read the offline product outbox:',
      error
    );

    return [];
  }
}

function writeOutbox(drafts) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(drafts)
  );

  notifyListeners();
}

function notifyListeners() {
  const drafts = readOutbox();

  listeners.forEach(listener => {
    try {
      listener(drafts);
    } catch (listenerError) {
      console.error(
        'Product outbox listener failed:',
        listenerError
      );
    }
  });
}

export function subscribeToProductOutbox(
  listener
) {
  listeners.add(listener);

  listener(readOutbox());

  return () => {
    listeners.delete(listener);
  };
}

export function getPendingProductDrafts() {
  return readOutbox();
}

export function getPendingProductDraftCount() {
  return readOutbox().length;
}

export function getProductDraftById(
  draftId
) {
  return (
    readOutbox().find(
      draft => draft.id === draftId
    ) || null
  );
}

function createDraftId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export function savePendingProductDraft({
  kind,
  productId = null,
  baseSyncVersion = 1,
  draft
}) {
  if (
    !['create', 'update'].includes(kind)
  ) {
    throw new Error(
      'Product draft kind must be create or update.'
    );
  }

  if (
    kind === 'update' &&
    !productId
  ) {
    throw new Error(
      'A product ID is required to save an offline product edit.'
    );
  }

  if (!draft?.name?.trim()) {
    throw new Error(
      'Product name is required.'
    );
  }

  const drafts = readOutbox();

  const now = new Date().toISOString();

  const newDraft = {
    id: createDraftId(),

    kind,

    productId,

    baseSyncVersion,

    draft: {
      ...draft,
      name: draft.name.trim()
    },

    status: 'pending',

    operationId: null,

    errorMessage: '',

    createdAt: now,

    updatedAt: now
  };

  writeOutbox([newDraft, ...drafts]);

  return newDraft;
}

export function updateProductDraftStatus(
  draftId,
  {
    status,
    operationId = null,
    errorMessage = ''
  }
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

    status,

    operationId:

      operationId ||
      drafts[index].operationId,

    errorMessage,

    updatedAt: new Date().toISOString()
  };

  writeOutbox(drafts);

  return drafts[index];
}

export function removeProductDraft(
  draftId
) {
  const drafts = readOutbox().filter(
    draft => draft.id !== draftId
  );

  writeOutbox(drafts);
}

export function clearCompletedProductDrafts() {
  const drafts = readOutbox().filter(
    draft =>
      draft.status !== 'synced' &&
      draft.status !== 'discarded'
  );

  writeOutbox(drafts);
}

async function syncOneDraft(draft) {
  updateProductDraftStatus(draft.id, {
    status: 'syncing'
  });

  try {
    let result;

    if (draft.kind === 'create') {
      result =
        await syncCreatedProductDraft({
          operationId:
            draft.operationId,
          draft: draft.draft
        });
    } else {
      result =
        await syncUpdatedProductDraft({
          operationId:
            draft.operationId,
          productId: draft.productId,
          baseSyncVersion:
            draft.baseSyncVersion,
          draft: draft.draft
        });
    }

    updateProductDraftStatus(draft.id, {
      status: 'synced',
      operationId: result.operationId,
      errorMessage: ''
    });

    return {
      draftId: draft.id,
      success: true,
      replayed: result.replayed,
      product: result.product
    };
  } catch (error) {
    const conflict =
      isOfflineSyncConflict(error);

    const retryable =
      isOfflineSyncRetryable(error);

    updateProductDraftStatus(
      draft.id,
      {
        status: conflict
          ? 'conflict'
          : retryable
            ? 'pending'
            : 'failed',

        operationId:
          error?.config?.data
            ? draft.operationId
            : draft.operationId,

        errorMessage:
          getOfflineSyncErrorMessage(
            error
          )
      }
    );

    return {
      draftId: draft.id,
      success: false,
      conflict,
      retryable,
      error
    };
  }
}

export async function syncPendingProductDrafts() {
  const drafts = readOutbox();

  const syncableDrafts = drafts.filter(
    draft =>
      draft.status === 'pending' ||
      draft.status === 'retryable'
  );

  if (syncableDrafts.length === 0) {
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

  for (const draft of syncableDrafts) {
    const result =
      await syncOneDraft(draft);

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

export function hasSyncableProductDrafts() {
  return readOutbox().some(
    draft =>
      draft.status === 'pending' ||
      draft.status === 'retryable'
  );
}