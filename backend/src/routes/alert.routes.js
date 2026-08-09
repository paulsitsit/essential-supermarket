import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import { listAlerts, markRead, resolve } from '../controllers/alert.controller.js';
const router = Router(); router.use(protect); router.get('/', listAlerts); router.put('/:id/read', markRead); router.put('/:id/resolve', allowRoles('admin', 'manager'), resolve); export default router;