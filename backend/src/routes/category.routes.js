import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import * as controller from '../controllers/category.controller.js';

const router = Router();
router.use(protect);
router.get('/', controller.list);
router.post('/', allowRoles('admin', 'manager'), controller.create);
router.put('/:id', allowRoles('admin', 'manager'), controller.update);
router.delete('/:id', allowRoles('admin', 'manager'), controller.remove);
export default router;