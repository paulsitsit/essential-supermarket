import mongoose from 'mongoose';

const expirationAlertSchema = new mongoose.Schema(
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
      default: ''
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
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

    /*
     * A milestone is added only after a push attempt has been made.
     *
     * Examples:
     * [30, 14, 7, 3, 0, -1]
     *
     * - 30: thirty days left
     * - 14: two weeks left
     * - 7: one week left
     * - 3: critical, three days left
     * - 0: expires today
     * - -1: first day after expiry
     */
    notificationMilestones: {
      type: [Number],
      default: []
    },

    /*
     * Lets the UI or audit/debug tools show when the latest
     * milestone notification attempt occurred.
     */
    lastNotificationAt: {
      type: Date,
      default: null
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
  batch: 1,
  expirationDate: 1,
  status: 1
});

expirationAlertSchema.index({
  product: 1,
  status: 1,
  expirationDate: 1
});

export default mongoose.model(
  'ExpirationAlert',
  expirationAlertSchema
);