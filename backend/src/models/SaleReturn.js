import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    saleItemIndex: { type: Number, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    barcode: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    condition: {
      type: String,
      enum: ['resellable', 'damaged', 'opened', 'expired', 'other'],
      required: true
    },
    reason: { type: String, default: '' },
    batchAllocations: {
      type: [
        {
          batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductBatch',
            required: true
          },
          batchNumber: { type: String, default: '' },
          expirationDate: { type: Date, default: null },
          quantity: { type: Number, required: true, min: 0 }
        }
      ],
      default: []
    },
    quarantineItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuarantineItem',
      default: null
    }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    items: { type: [returnItemSchema], required: true },
    totalRefund: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    branch: { type: String, default: 'Main Branch' }
  },
  { timestamps: true, collection: 'saleReturns' }
);

export default mongoose.model('SaleReturn', schema);