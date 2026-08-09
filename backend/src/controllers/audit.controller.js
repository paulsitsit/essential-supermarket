import AuditLog from '../models/AuditLog.js';

export async function listAuditLogs(req, res) {
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.account) filter.account = req.query.account;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).populate('account', 'fullName email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter)
  ]);
  res.json({ rows, page, limit, total, pages: Math.ceil(total / limit) });
}