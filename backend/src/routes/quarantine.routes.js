import express from 'express';
import * as quarantineController from '../controllers/quarantine.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', quarantineController.listQuarantine);
router.patch('/:id/dispose', quarantineController.disposeItem);
router.patch('/:id/returnToSupplier', quarantineController.returnToSupplier);
router.patch('/:id/release', quarantineController.releaseToStock);

export default router;