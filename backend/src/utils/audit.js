import AuditLog from '../models/AuditLog.js';

export async function writeAudit({ req, account, action, affectedRecord, metadata }) {
  return AuditLog.create({
    account: account?._id,
    accountName: account?.fullName,
    accountRole: account?.role,
    action,
    affectedRecord,
    metadata,
    ipAddress: req.ip
  });
}