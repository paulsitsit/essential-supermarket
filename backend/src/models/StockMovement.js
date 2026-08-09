import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  movementType: { type: String, enum: ['stock_in', 'stock_adjustment', 'damaged', 'expired', 'returned_to_supplier', 'branch_transfer', 'manual_correction'], required: true },
  quantityChanged: { type: Number, required: true },
  previousStock: { type: Number, required: true, min: 0 },
  newStock: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true },
  branch: { type: String, default: 'Main Branch' }
}, { timestamps: true, collection: 'stockMovements' });

export default mongoose.model('StockMovement', schema);