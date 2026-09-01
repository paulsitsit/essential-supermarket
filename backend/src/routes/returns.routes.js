import express from 'express';
import * as returnsController from '../controllers/returns.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', returnsController.listReturns);

router.get(
  '/sale/:saleId/balance',
  returnsController.getSaleReturnBalance
);

router.get('/:id', returnsController.getReturn);

router.post('/', returnsController.createReturn);

export default router;