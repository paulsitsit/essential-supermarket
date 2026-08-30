import express from 'express';
import * as quarantineController from '../controllers/quarantine.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', quarantineController.listQuarantine);
router.patch('/:id/dispose', quarantineController.disposeItem);
router.patch('/:id/returnToSupplier', quarantineController.returnToSupplier);
router.patch('/:id/release', quarantineController.releaseToStock);

export default router;