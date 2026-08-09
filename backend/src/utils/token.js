import jwt from 'jsonwebtoken';

export function signToken(account) {
  return jwt.sign(
    { id: account._id.toString(), role: account.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}