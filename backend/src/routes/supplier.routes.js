import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import * as controller from '../controllers/supplier.controller.js';
const router = Router(); router.use(protect); router.get('/', controller.list); router.post('/', allowRoles('admin'), controller.create); router.put('/:id', allowRoles('admin'), controller.update); router.delete('/:id', allowRoles('admin'), controller.remove); export default router;