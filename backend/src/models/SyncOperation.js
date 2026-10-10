import mongoose from 'mongoose';

const syncOperationSchema = new mongoose.Schema(
  {
    operationId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    type: {
      type: String,
      required: true,
      enum: [
        'product_create',
        'product_update'
      ]
    },

    status: {
      type: String,
      required: true,
      enum: [
        'processing',
        'completed',
        'retryable',
        'failed'
      ],
      default: 'processing',
      index: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },

    response: {
      type: Object,
      default: null
    },

    errorMessage: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  'SyncOperation',
  syncOperationSchema
);