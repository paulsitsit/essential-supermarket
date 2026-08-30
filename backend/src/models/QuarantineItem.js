import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    barcode: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    source: {
      type: String,
      enum: ['customer_return', 'goods_in_damage', 'warehouse_damage', 'expired_pull'],
      default: 'customer_return'
    },
    sourceReturn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SaleReturn',
      default: null
    },
    condition: {
      type: String,
      enum: ['damaged', 'opened', 'expired', 'other'],
      required: true
    },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending_inspection', 'disposed', 'returned_to_supplier', 'released_to_stock'],
      default: 'pending_inspection'
    },
    dispositionNotes: { type: String, default: '' },
    disposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    disposedAt: { type: Date, default: null },
    branch: { type: String, default: 'Main Branch' }
  },
  { timestamps: true, collection: 'quarantineItems' }
);

export default mongoose.model('QuarantineItem', schema);