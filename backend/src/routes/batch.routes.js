import { Router } from 'express';

import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';

import {
  getBatchesByBarcode,
  getBatchesByProductId,
  receiveStockBatch,
  updateBatch,
  listExpiringSoonBatches,
  traceBatch,
  damageBatch,
  adjustBatchQuantity,
  listBatches
} from '../controllers/batch.controller.js';

const router = Router();

router.use(protect);

// List all active batches
router.get(
  '/',
  allowRoles('admin', 'manager', 'staff'),
  listBatches
);

// Expiring soon (used by your Expiring Soon page)
router.get(
  '/expiring-soon',
  allowRoles('admin', 'manager', 'staff'),
  listExpiringSoonBatches
);

// Trace / recall
router.get(
  '/trace/:batchNumber',
  allowRoles('admin', 'manager', 'staff'),
  traceBatch
);

// By barcode
router.get(
  '/barcode/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  getBatchesByBarcode
);

// By product ID
router.get(
  '/product/:productId',
  allowRoles('admin', 'manager', 'staff'),
  getBatchesByProductId
);

// Receive stock into a new batch
router.post(
  '/receive',
  allowRoles('admin', 'manager', 'staff'),
  receiveStockBatch
);

// Update batch (e.g. expiration date)
router.put(
  '/:id',
  allowRoles('admin', 'manager'),
  updateBatch
);

// Damage / destroy batch
router.post(
  '/:id/damage',
  allowRoles('admin', 'manager'),
  damageBatch
);

// Adjust batch quantity (stocktake)
router.post(
  '/:id/adjust',
  allowRoles('admin', 'manager'),
  adjustBatchQuantity
);

export default router;