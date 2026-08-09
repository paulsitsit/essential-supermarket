import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true, collection: 'categories' });

export default mongoose.model('Category', schema);