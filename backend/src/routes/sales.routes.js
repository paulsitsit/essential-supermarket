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

router.post(
  '/',
  allowRoles('admin', 'manager', 'staff'),
  createSale
);

export default router;