import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const accountSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: [
        'admin',
        'manager',
        'staff',
        'cashier'
      ],
      default: 'staff',
      index: true
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },

    branch: {
      type: String,
      trim: true,
      default: 'Main Branch'
    },

    lastLogin: Date
  },
  {
    timestamps: true,
    collection: 'accounts'
  }
);

accountSchema.methods.comparePassword = function (
  password
) {
  return bcrypt.compare(password, this.passwordHash);
};

accountSchema.statics.hashPassword = password =>
  bcrypt.hash(password, 12);

export default mongoose.model(
  'Account',
  accountSchema
);