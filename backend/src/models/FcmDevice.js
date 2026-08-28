import mongoose from 'mongoose';

const fcmDeviceSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    token: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    platform: {
      type: String,
      enum: ['android'],
      default: 'android'
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
  'FcmDevice',
  fcmDeviceSchema
);