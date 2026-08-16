import mongoose from 'mongoose';

const productBatchSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    barcode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },

    expirationDate: {
      type: Date,
      default: null,
      index: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    batchNumber: {
      type: String,
      trim: true,
      default: ''
    },

    branch: {
      type: String,
      trim: true,
      default: 'Main Branch'
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'productBatches'
  }
);

productBatchSchema.index({
  product: 1,
  quantity: 1,
  expirationDate: 1,
  receivedDate: 1
});

productBatchSchema.index({
  barcode: 1,
  quantity: 1,
  expirationDate: 1
});

productBatchSchema.index(
  {
    product: 1,
    batchNumber: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      batchNumber: {
        $type: 'string',
        $ne: ''
      }
    }
  }
);

export default mongoose.model(
  'ProductBatch',
  productBatchSchema
);