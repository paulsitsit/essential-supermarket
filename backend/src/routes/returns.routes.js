import express from 'express';
import * as returnsController from '../controllers/returns.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', returnsController.listReturns);
router.get('/:id', returnsController.getReturn);
router.post('/', returnsController.createReturn);

export default router;