import { Router } from 'express';

import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';

import {
  getBatchesByBarcode,
  getBatchesByProductId,
  receiveStockBatch,
  updateBatch,
  listExpiringSoonBatches
} from '../controllers/batch.controller.js';

const router = Router();

router.use(protect);

router.get(
  '/expiring-soon',
  allowRoles('admin', 'manager', 'staff'),
  listExpiringSoonBatches
);

router.get(
  '/barcode/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  getBatchesByBarcode
);

router.get(
  '/product/:productId',
  allowRoles('admin', 'manager', 'staff'),
  getBatchesByProductId
);

router.post(
  '/receive',
  allowRoles('admin', 'manager', 'staff'),
  receiveStockBatch
);

router.put(
  '/:id',
  allowRoles('admin', 'manager'),
  updateBatch
);

export default router;