import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  accountName: String,
  accountRole: String,
  action: { type: String, required: true },
  affectedRecord: String,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String
}, { timestamps: true, collection: 'auditLogs' });

export default mongoose.model('AuditLog', schema);