import Account from '../models/Account.js';
import { writeAudit } from '../utils/audit.js';

const clean = a => ({ id: a._id, fullName: a.fullName, email: a.email, role: a.role, status: a.status, branch: a.branch, lastLogin: a.lastLogin, createdAt: a.createdAt, updatedAt: a.updatedAt });

export async function list(req, res) { res.json((await Account.find().sort({ createdAt: -1 })).map(clean)); }
export async function get(req, res) { const account = await Account.findById(req.params.id); if (!account) return res.status(404).json({ message: 'Account not found' }); res.json(clean(account)); }
export async function create(req, res) {
  const { fullName, email, password, role, branch } = req.body;
  if (!fullName || !email || !password || !role) return res.status(400).json({ message: 'Full name, email, password, and role are required' });
  if (!['admin', 'manager', 'staff'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const account = await Account.create({ fullName, email, role, branch, passwordHash: await Account.hashPassword(password) });
  await writeAudit({ req, account: req.account, action: 'account_created', affectedRecord: account._id.toString() });
  res.status(201).json(clean(account));
}
export async function update(req, res) {
  const updates = { fullName: req.body.fullName, email: req.body.email, branch: req.body.branch };
  if (req.body.role) updates.role = req.body.role;
  if (req.body.password) updates.passwordHash = await Account.hashPassword(req.body.password);
  const account = await Account.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!account) return res.status(404).json({ message: 'Account not found' });
  await writeAudit({ req, account: req.account, action: 'account_updated', affectedRecord: account._id.toString() });
  res.json(clean(account));
}
export async function changeStatus(req, res) {
  if (req.params.id === req.account.id && req.body.status === 'inactive') return res.status(400).json({ message: 'You cannot deactivate your own account' });
  const account = await Account.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!account) return res.status(404).json({ message: 'Account not found' });
  await writeAudit({ req, account: req.account, action: 'account_deactivated', affectedRecord: account._id.toString() });
  res.json(clean(account));
}
export async function changeRole(req, res) {
  if (!['admin', 'manager', 'staff'].includes(req.body.role)) return res.status(400).json({ message: 'Invalid role' });
  const account = await Account.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, runValidators: true });
  if (!account) return res.status(404).json({ message: 'Account not found' });
  res.json(clean(account));
}
export async function remove(req, res) { if (req.params.id === req.account.id) return res.status(400).json({ message: 'You cannot delete your own account' }); await Account.findByIdAndDelete(req.params.id); res.json({ message: 'Account deleted' }); }