export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.account || !roles.includes(req.account.role)) {
    return res.status(403).json({ message: 'You do not have permission for this action' });
  }
  next();
};