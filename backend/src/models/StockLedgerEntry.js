import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductBatch',
      required: true,
      index: true
    },

    batchNumber: {
      type: String,
      trim: true,
      default: ''
    },

    movementType: {
      type: String,
      enum: [
        'stock_in',
        'sale',
        'stock_adjustment',
        'damaged',
        'expired',
        'returned_to_supplier',
        'branch_transfer',
        'manual_correction',
        'customer_return',
        'quarantine_release',
        'quarantine_disposal',
        'return_to_supplier'
      ],
      required: true,
      index: true
    },

    quantityChanged: {
      type: Number,
      required: true
    },

    batchStockBefore: {
      type: Number,
      required: true,
      min: 0
    },

    batchStockAfter: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    referenceType: {
      type: String,
      enum: ['sale', 'return', 'adjustment', 'purchase_order', 'transfer', 'manual'],
      default: 'manual'
    },

    referenceId: {
      type: String,
      index: true
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    branch: {
      type: String,
      default: 'Main Branch',
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'stockLedgerEntries'
  }
);

// Make completely immutable - no updates allowed
schema.pre('findOneAndUpdate', function(next) {
  next(new Error('StockLedgerEntry is immutable. Create a correction entry instead.'));
});

schema.pre('findOneAndDelete', function(next) {
  next(new Error('StockLedgerEntry cannot be deleted.'));
});

// Compound indexes for common queries
schema.index({ batch: 1, createdAt: -1 });
schema.index({ product: 1, batch: 1, createdAt: -1 });
schema.index({ performedBy: 1, createdAt: -1 });
schema.index({ movementType: 1, createdAt: -1 });

export default mongoose.model('StockLedgerEntry', schema);