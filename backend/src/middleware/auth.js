import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const account = await Account.findById(decoded.id);
    if (!account || account.status !== 'active') return res.status(401).json({ message: 'Account is inactive or unavailable' });
    req.account = account;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}