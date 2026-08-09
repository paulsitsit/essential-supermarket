import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  type: { type: String, required: true },
  title: String,
  message: String,
  data: mongoose.Schema.Types.Mixed,
  readAt: Date
}, { timestamps: true, collection: 'notifications' });

export default mongoose.model('Notification', schema);