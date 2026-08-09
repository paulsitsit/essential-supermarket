import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: Number, default: 0 }
}, { collection: 'sequences' });

export default mongoose.model('Sequence', schema);