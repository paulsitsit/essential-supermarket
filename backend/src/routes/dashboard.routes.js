import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { summary, realtimeStock } from '../controllers/dashboard.controller.js';
const router = Router(); router.use(protect); router.get('/summary', summary); router.get('/real-time-stock', realtimeStock); export default router;