import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  currentStock: { type: Number, required: true },
  reorderLevel: { type: Number, required: true },
  status: { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
  severity: { type: String, enum: ['warning', 'critical'], default: 'warning' },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
}, { timestamps: true, collection: 'lowStockAlerts' });

schema.index({ product: 1, status: 1 });
export default mongoose.model('LowStockAlert', schema);