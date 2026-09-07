import express from 'express';
import {
  getBatchLedgerController,
  getProductLedgerController,
  getProductMovementsController,
  getBatchVarianceController,
  getProductVariancesController
} from '../controllers/stockLedger.controller.js';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Batch-level ledger
router.get(
  '/batches/:batchId/ledger',
  allowRoles('admin', 'manager', 'staff'),
  getBatchLedgerController
);

// Product-level ledger (all batches)
router.get(
  '/products/:productId/ledger',
  allowRoles('admin', 'manager', 'staff'),
  getProductLedgerController
);

// Product-level movements
router.get(
  '/products/:productId/movements',
  allowRoles('admin', 'manager', 'staff'),
  getProductMovementsController
);

// Batch variance check
router.get(
  '/batches/:batchId/variance',
  allowRoles('admin', 'manager'),
  getBatchVarianceController
);

// Product variances (all batches)
router.get(
  '/products/:productId/variances',
  allowRoles('admin', 'manager'),
  getProductVariancesController
);

export default router;