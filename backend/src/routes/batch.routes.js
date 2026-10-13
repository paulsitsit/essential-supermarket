import { Router } from 'express';

import {
  getBatchesByBarcode,
  getBatchesByProductId,
  receiveStockBatch,
  syncReceiveStockDraft,
  updateBatch,
  listExpiringSoonBatches,
  traceBatch,
  damageBatch,
  adjustBatchQuantity,
  listBatches
} from '../controllers/batch.controller.js';

import {
  protect
} from '../middleware/auth.js';

import {
  allowRoles
} from '../middleware/roles.js';

const router = Router();

router.use(protect);

/*
 * Replay-safe synchronization of offline
 * Receive Stock drafts.
 *
 * Keep this above parameterized routes.
 */
router.post(
  '/sync-receive',
  allowRoles('admin', 'manager'),
  syncReceiveStockDraft
);

router.post(
  '/receive',
  allowRoles('admin', 'manager'),
  receiveStockBatch
);

router.get(
  '/expiring-soon',
  allowRoles(
    'admin',
    'manager',
    'staff'
  ),
  listExpiringSoonBatches
);

router.get(
  '/trace/:batchNumber',
  allowRoles(
    'admin',
    'manager',
    'staff'
  ),
  traceBatch
);

router.get(
  '/barcode/:barcode',
  allowRoles(
    'admin',
    'manager',
    'staff',
    'cashier'
  ),
  getBatchesByBarcode
);

router.get(
  '/product/:productId',
  allowRoles(
    'admin',
    'manager',
    'staff'
  ),
  getBatchesByProductId
);

router.get(
  '/',
  allowRoles(
    'admin',
    'manager',
    'staff'
  ),
  listBatches
);

router.put(
  '/:id',
  allowRoles('admin', 'manager'),
  updateBatch
);

router.post(
  '/:id/damage',
  allowRoles('admin', 'manager'),
  damageBatch
);

router.post(
  '/:id/adjust',
  allowRoles('admin', 'manager'),
  adjustBatchQuantity
);

export default router;