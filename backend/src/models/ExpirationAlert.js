import mongoose from 'mongoose';

const expirationAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    expirationDate: {
      type: Date,
      required: true,
      index: true
    },

    daysRemaining: {
      type: Number,
      required: true
    },

    severity: {
      type: String,
      enum: [
        'info',
        'warning',
        'critical'
      ],
      default: 'info'
    },

    status: {
      type: String,
      enum: [
        'unread',
        'read',
        'resolved'
      ],
      default: 'unread',
      index: true
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'expirationAlerts'
  }
);

expirationAlertSchema.index({
  product: 1,
  expirationDate: 1,
  status: 1
});

export default mongoose.model(
  'ExpirationAlert',
  expirationAlertSchema
);