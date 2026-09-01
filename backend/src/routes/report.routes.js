import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import * as controller from '../controllers/report.controller.js';

const router = Router();

router.use(protect, allowRoles('admin', 'manager'));

router.get('/inventory', controller.inventory);
router.get('/low-stock', controller.lowStock);
router.get('/stock-movements', controller.movements);
router.get('/sales-returns', controller.salesReturns);

export default router;