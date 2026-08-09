import express from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// All audit-log routes require an authenticated Admin account
router.use(protect);
router.use(allowRoles('admin'));

router.get('/', async (req, res, next) => {
  try {
    const {
      action,
      account,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (account) {
      filter.account = account;
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('account', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageLimit)
        .limit(pageLimit),

      AuditLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      totalPages: Math.ceil(total / pageLimit),
      currentPage,
      total
    });
  } catch (error) {
    next(error);
  }
});

export default router;