import Dexie from 'dexie';

const db = new Dexie('essentialProductOutbox');

db.version(1).stores({
  drafts: '&id, ownerId, apiBase, status, createdAt'
});

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const CATALOG_FIELDS = [
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

function getOwner() {
  let account = null;

  try {
    account = JSON.parse(
      localStorage.getItem('essential_account') || 'null'
    );
  } catch {
    account = null;
  }

  const ownerId = account?._id || account?.id;
  const token = localStorage.getItem('essential_token');

  if (!ownerId || !token) {
    throw new Error(
      'A previously signed-in account is required.'
    );
  }

  if (account.role !== 'admin') {
    throw new Error(
      'Only admins can save product drafts.'
    );
  }

  return {
    ownerId: String(ownerId),
    apiBase: API_BASE
  };
}

function notifyChanged() {
  window.dispatchEvent(
    new Event('essential-product-outbox-changed')
  );
}

export async function saveProductDraft({
  payload,
  initialProduct,
  imageFile
}) {
  const owner = getOwner();
  const isEditing = Boolean(initialProduct?._id);

  const catalogPayload = Object.fromEntries(
    CATALOG_FIELDS
      .filter(field => payload[field] !== undefined)
      .map(field => [field, payload[field]])
  );

  // Catalog edits never replay an old stock quantity.
  if (!isEditing) {
    catalogPayload.currentStock = 0;
  }

  const now = new Date().toISOString();

  const draft = {
    id: crypto.randomUUID(),
    ...owner,

    kind: isEditing ? 'update' : 'create',

    productId: isEditing
      ? String(initialProduct._id)
      : null,

    baseProduct: isEditing
      ? structuredClone(initialProduct)
      : null,

    baseUpdatedAt:
      initialProduct?.updatedAt || null,

    payload: catalogPayload,

    // Retain original form values separately.
    formValues: structuredClone(payload),

    imageBlob: imageFile || null,
    imageName: imageFile?.name || '',
    imageType: imageFile?.type || '',

    status: 'local_draft',
    createdAt: now,
    updatedAt: now
  };

  try {
    await db.drafts.add(draft);
  } catch (error) {
    console.error(
      'Unable to save product draft:',
      error
    );

    throw new Error(
      'The product could not be saved on this device. ' +
      'Check available storage and browser storage permissions. ' +
      'Keep this form open until the save succeeds.'
    );
  }

  notifyChanged();

  return draft;
}

export async function listProductDrafts() {
  const owner = getOwner();

  const drafts = await db.drafts
    .where('ownerId')
    .equals(owner.ownerId)
    .toArray();

  return drafts
    .filter(draft => draft.apiBase === owner.apiBase)
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
}

export async function discardProductDraft(id) {
  const owner = getOwner();

  await db.transaction('rw', db.drafts, async () => {
    const draft = await db.drafts.get(id);

    if (!draft) {
      return;
    }

    if (
      draft.ownerId !== owner.ownerId ||
      draft.apiBase !== owner.apiBase
    ) {
      throw new Error(
        'This draft belongs to another account or server.'
      );
    }

    await db.drafts.delete(id);
  });

  notifyChanged();
}