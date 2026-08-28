import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    keys: {
      p256dh: {
        type: String,
        required: true
      },

      auth: {
        type: String,
        required: true
      }
    },

    userAgent: {
      type: String,
      default: ''
    },

    enabled: {
      type: Boolean,
      default: true
    },

    lastUsedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  'PushSubscription',
  pushSubscriptionSchema
);