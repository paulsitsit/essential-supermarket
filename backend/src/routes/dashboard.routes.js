import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import {
  summary,
  realtimeStock,
  getExpirySummary
} from '../controllers/dashboard.controller.js';
import {
  cardTotals
} from '../controllers/dashboardCardTotals.controller.js';

const router = Router();
router.use(protect);

router.get('/summary', summary);
router.get('/real-time-stock', realtimeStock);
router.get('/card-totals', cardTotals);

// Expiry summary for dashboard widget
router.get(
  '/expiry-summary',
  allowRoles('admin', 'manager', 'staff'),
  getExpirySummary
);

export default router;
