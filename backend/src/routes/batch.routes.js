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

/*
 * Staff may scan and read batch/product information,
 * but cannot change stock quantities.
 */

// List active batches
router.get(
  '/',
  allowRoles('admin', 'manager', 'staff'),
  listBatches
);

// Expiring batches
router.get(
  '/expiring-soon',
  allowRoles('admin', 'manager', 'staff'),
  listExpiringSoonBatches
);

// Batch trace / recall lookup
router.get(
  '/trace/:batchNumber',
  allowRoles('admin', 'manager', 'staff'),
  traceBatch
);

// Scanner barcode lookup
router.get(
  '/barcode/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  getBatchesByBarcode
);

// Product batch lookup
router.get(
  '/product/:productId',
  allowRoles('admin', 'manager', 'staff'),
  getBatchesByProductId
);

/*
 * Inventory-changing actions:
 * Admin and Manager only.
 */

// Receive a new stock batch
router.post(
  '/receive',
  allowRoles('admin', 'manager'),
  receiveStockBatch
);

// Update batch metadata, such as expiry date
router.put(
  '/:id',
  allowRoles('admin', 'manager'),
  updateBatch
);

// Remove damaged/destroyed inventory
router.post(
  '/:id/damage',
  allowRoles('admin', 'manager'),
  damageBatch
);

// Change physical batch quantity after stocktake
router.post(
  '/:id/adjust',
  allowRoles('admin', 'manager'),
  adjustBatchQuantity
);

export default router;