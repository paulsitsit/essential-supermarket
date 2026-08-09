import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/security.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';

const router = Router();
const loginRules = [body('email').isEmail().withMessage('A valid email is required'), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')];
router.post('/login', loginLimiter, loginRules, validateRequest, login);
router.get('/me', protect, me);
export default router;