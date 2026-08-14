import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import { createSale, listSales } from '../controllers/sales.controller.js';

const router = Router();
router.use(protect);

router.get('/', allowRoles('admin', 'manager'), listSales);
router.post('/', allowRoles('admin', 'manager', 'staff'), createSale);

export default router;