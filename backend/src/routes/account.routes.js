import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import * as controller from '../controllers/account.controller.js';
const router = Router(); router.use(protect, allowRoles('admin')); router.get('/', controller.list); router.post('/', controller.create); router.get('/:id', controller.get); router.put('/:id', controller.update); router.patch('/:id/status', controller.changeStatus); router.patch('/:id/role', controller.changeRole); router.delete('/:id', controller.remove); export default router;