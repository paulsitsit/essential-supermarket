import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: String,
  phone: String,
  email: { type: String, lowercase: true, trim: true },
  address: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true, collection: 'suppliers' });

schema.index({ name: 1 }, { unique: true });
export default mongoose.model('Supplier', schema);