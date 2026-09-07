import express from 'express';
import {
  getBatchLedgerController,
  getProductLedgerController,
  getProductMovementsController,
  getBatchVarianceController,
  getProductVariancesController
} from '../controllers/stockLedger.controller.js';
import { protect } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Batch-level ledger
router.get(
  '/batches/:batchId/ledger',
  checkRole(['admin', 'manager', 'staff']),
  getBatchLedgerController
);

// Product-level ledger (all batches)
router.get(
  '/products/:productId/ledger',
  checkRole(['admin', 'manager', 'staff']),
  getProductLedgerController
);

// Product-level movements
router.get(
  '/products/:productId/movements',
  checkRole(['admin', 'manager', 'staff']),
  getProductMovementsController
);

// Batch variance check
router.get(
  '/batches/:batchId/variance',
  checkRole(['admin', 'manager']),
  getBatchVarianceController
);

// Product variances (all batches)
router.get(
  '/products/:productId/variances',
  checkRole(['admin', 'manager']),
  getProductVariancesController
);

export default router;