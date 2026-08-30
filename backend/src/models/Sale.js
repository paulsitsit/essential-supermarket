import mongoose from 'mongoose';

const saleBatchAllocationSchema = new mongoose.Schema(
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
      min: 1
    }
  },
  {
    _id: false
  }
);

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    barcode: {
      type: String,
      required: true,
      trim: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    batchAllocations: {
      type: [saleBatchAllocationSchema],
      default: []
    }
  },
  {
    _id: false
  }
);

const saleSchema = new mongoose.Schema(
  {
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },

    items: [saleItemSchema],

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentMethod: {
      type: String,
      enum: [
        'cash',
        'card',
        'gcash',
        'paymaya'
      ],
      default: 'cash'
    },

    status: {
      type: String,
      enum: [
        'completed',
        'refunded',
        'voided'
      ],
      default: 'completed'
    },

    returns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleReturn'
      }
    ],

    hasReturns: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'sales'
  }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ cashier: 1, createdAt: -1 });

export default mongoose.model(
  'Sale',
  saleSchema
);