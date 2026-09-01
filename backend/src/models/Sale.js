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

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: value =>
          Array.isArray(value) && value.length > 0,
        message: 'A sale must contain at least one item'
      }
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    netAmount: {
      type: Number,
      default: null,
      min: 0
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'gcash', 'paymaya'],
      default: 'cash'
    },

    branch: {
      type: String,
      default: 'Main Branch',
      trim: true
    },

    status: {
      type: String,
      enum: [
        'completed',
        'partially_refunded',
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

saleSchema.pre('validate', function (next) {
  const totalAmount = Number(this.totalAmount || 0);
  const refundedAmount = Number(this.refundedAmount || 0);

  if (this.isNew && this.netAmount == null) {
    this.netAmount = Math.max(
      totalAmount - refundedAmount,
      0
    );
  }

  next();
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ cashier: 1, createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 });
saleSchema.index({ receiptNumber: 1 });

export default mongoose.model('Sale', saleSchema);