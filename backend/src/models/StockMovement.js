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
        /*
         * Normal inventory receipt.
         */
        'stock_in',

        /*
         * Normal POS checkout. Quantity is negative.
         */
        'sale',

        /*
         * Physical-count or administrative stock change.
         * Admin / Manager only.
         */
        'stock_adjustment',

        /*
         * Inventory loss/disposal operations.
         */
        'damaged',
        'expired',
        'returned_to_supplier',
        'branch_transfer',
        'manual_correction',

        /*
         * Customer return and quarantine workflow.
         */
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
    }
  },
  {
    timestamps: true,
    collection: 'stockMovements'
  }
);

schema.index({
  product: 1,
  createdAt: -1
});

schema.index({
  movementType: 1,
  createdAt: -1
});

export default mongoose.model(
  'StockMovement',
  schema
);