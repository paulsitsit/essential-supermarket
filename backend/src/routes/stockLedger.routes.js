import express from 'express';
import {
  getBatchLedgerController,
  getProductLedgerController,
  getProductMovementsController,
  getBatchVarianceController,
  getProductVariancesController
} from '../controllers/stockLedger.controller.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Batch-level ledger
router.get(
  '/batches/:batchId/ledger',
  requireRole(['admin', 'manager', 'staff']),
  getBatchLedgerController
);

// Product-level ledger (all batches)
router.get(
  '/products/:productId/ledger',
  requireRole(['admin', 'manager', 'staff']),
  getProductLedgerController
);

// Product-level movements
router.get(
  '/products/:productId/movements',
  requireRole(['admin', 'manager', 'staff']),
  getProductMovementsController
);

// Batch variance check
router.get(
  '/batches/:batchId/variance',
  requireRole(['admin', 'manager']),
  getBatchVarianceController
);

// Product variances (all batches)
router.get(
  '/products/:productId/variances',
  requireRole(['admin', 'manager']),
  getProductVariancesController
);

export default router;