import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import {
  listExpirationAlerts,
  markExpirationRead,
  resolveExpiration
} from '../controllers/alert.controller.js';

const router = Router();

router.use(protect);

router.get('/', listExpirationAlerts);

router.put(
  '/:id/read',
  markExpirationRead
);

router.put(
  '/:id/resolve',
  allowRoles('admin', 'manager'),
  resolveExpiration
);

export default router;