import mongoose from 'mongoose';

const batchAllocationSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductBatch',
      required: true
    },

    batchNumber: {
      type: String,
      default: ''
    },

    expirationDate: {
      type: Date,
      default: null
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const schema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
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

    previousStock: {
      type: Number,
      required: true,
      min: 0
    },

    newStock: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    branch: {
      type: String,
      default: 'Main Branch'
    },

    batchAllocations: {
      type: [batchAllocationSchema],
      default: []
    },

    // NEW: Reference to source document for traceability
    referenceType: {
      type: String,
      enum: ['sale', 'return', 'adjustment', 'purchase_order', 'transfer', 'manual'],
      default: 'manual'
    },

    referenceId: {
      type: String,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'stockMovements'
  }
);

// Prevent updates to critical fields (immutable ledger)
schema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  const protectedFields = [
    'product',
    'account',
    'movementType',
    'quantityChanged',
    'previousStock',
    'newStock',
    'batchAllocations',
    'referenceType',
    'referenceId'
  ];

  protectedFields.forEach(field => {
    if (update[field]) {
      delete update[field];
    }
    if (update.$set && update.$set[field]) {
      delete update.$set[field];
    }
  });

  next();
});

schema.index({ product: 1, createdAt: -1 });
schema.index({ movementType: 1, createdAt: -1 });
schema.index({ referenceType: 1, referenceId: 1 });

export default mongoose.model('StockMovement', schema);