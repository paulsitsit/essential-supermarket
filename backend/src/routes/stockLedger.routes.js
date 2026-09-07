import express from 'express';
import {
  getBatchLedgerController,
  getProductLedgerController,
  getProductMovementsController,
  getBatchVarianceController,
  getProductVariancesController
} from '../controllers/stockLedger.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Batch-level ledger
router.get(
  '/batches/:batchId/ledger',
  authorize(['admin', 'manager', 'staff']),
  getBatchLedgerController
);

// Product-level ledger (all batches)
router.get(
  '/products/:productId/ledger',
  authorize(['admin', 'manager', 'staff']),
  getProductLedgerController
);

// Product-level movements
router.get(
  '/products/:productId/movements',
  authorize(['admin', 'manager', 'staff']),
  getProductMovementsController
);

// Batch variance check
router.get(
  '/batches/:batchId/variance',
  authorize(['admin', 'manager']),
  getBatchVarianceController
);

// Product variances (all batches)
router.get(
  '/products/:productId/variances',
  authorize(['admin', 'manager']),
  getProductVariancesController
);

export default router;