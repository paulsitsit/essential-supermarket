import Account from '../models/Account.js';
import { signToken } from '../utils/token.js';
import { writeAudit } from '../utils/audit.js';

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const account = await Account.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!account || !(await account.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
  if (account.status !== 'active') return res.status(403).json({ message: 'This account is inactive' });
  account.lastLogin = new Date();
  await account.save();
  await writeAudit({ req, account, action: 'account_login', affectedRecord: account._id.toString() });
  res.json({ token: signToken(account), account: { id: account._id, fullName: account.fullName, email: account.email, role: account.role, branch: account.branch } });
}

export async function me(req, res) {
  res.json({ account: { id: req.account._id, fullName: req.account.fullName, email: req.account.email, role: req.account.role, branch: req.account.branch } });
}