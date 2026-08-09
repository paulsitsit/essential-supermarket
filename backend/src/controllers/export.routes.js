import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import { exportReport } from '../controllers/export.controller.js';
const router = Router();
router.use(protect, allowRoles('admin', 'manager'));
router.get('/:type', exportReport);
export default router;