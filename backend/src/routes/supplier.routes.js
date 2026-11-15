import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import * as controller from '../controllers/supplier.controller.js';
const router = Router(); router.use(protect); router.get('/', controller.list); router.post('/', allowRoles('manager'), controller.create); router.put('/:id', allowRoles('manager'), controller.update); router.delete('/:id', allowRoles('manager'), controller.remove); export default router;