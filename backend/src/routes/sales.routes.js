import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';

import {
  createSale,
  getSaleByReceiptNumber,
  listSales
} from '../controllers/sales.controller.js';

const router = Router();

router.use(protect);

/*
 * Sales-management functions:
 * Admin and Manager only.
 */

router.get(
  '/receipt/:receiptNumber',
  allowRoles('admin', 'manager'),
  getSaleByReceiptNumber
);

router.get(
  '/',
  allowRoles('admin', 'manager'),
  listSales
);

/*
 * Point-of-sale checkout:
 * Cashier may create transactions but cannot access
 * sales history, receipts, returns, inventory, or reports.
 */
router.post(
  '/',
  allowRoles(
    'admin',
    'manager',
    'cashier'
  ),
  createSale
);

export default router;