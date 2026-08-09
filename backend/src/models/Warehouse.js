import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  address: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true, collection: 'warehouses' });

export default mongoose.model('Warehouse', schema);