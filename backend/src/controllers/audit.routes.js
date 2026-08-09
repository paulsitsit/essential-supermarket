import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import { listAuditLogs } from '../controllers/audit.controller.js';
const router = Router();
router.use(protect, allowRoles('admin'));
router.get('/', listAuditLogs);
export default router;