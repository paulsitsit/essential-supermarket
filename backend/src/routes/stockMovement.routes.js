import { Router } from 'express';
import { listMovements, createMovement } from '../controllers/stockMovement.controller.js';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import { movementRules } from '../validators/movement.validators.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();
router.use(protect);
router.get('/', listMovements);
router.post('/', allowRoles('admin', 'manager', 'staff'), movementRules, validateRequest, createMovement);
export default router;