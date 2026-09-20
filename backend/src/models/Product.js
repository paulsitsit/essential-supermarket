import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    barcode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    qrCode: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },

    brand: {
      type: String,
      trim: true,
      default: ''
    },

    description: {
      type: String,
      trim: true,
      default: ''
    },

    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },

    imagePublicId: {
      type: String,
      trim: true,
      default: ''
    },

    unitType: {
      type: String,
      trim: true,
      enum: [
        'piece',
        'kg',
        'g',
        'lb',
        'oz',
        'liter',
        'ml',
        'box',
        'pack',
        'bottle',
        'can'
      ],
      default: 'piece'
    },

    branch: {
      type: String,
      trim: true,
      default: 'Main Branch'
    },

    currentStock: {
      type: Number,
      min: 0,
      default: 0
    },

    reorderLevel: {
      type: Number,
      min: 0,
      default: 10
    },

    costPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    sellingPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    inventoryValue: {
      type: Number,
      min: 0,
      default: 0
    },

    status: {
      type: String,
      enum: [
        'normal',
        'low_stock',
        'out_of_stock',
        'damaged',
        'expired'
      ],
      default: 'normal'
    },

    isArchived: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'products'
  }
);

productSchema.index(
  { barcode: 1 },
  { unique: true }
);

productSchema.index(
  { sku: 1 },
  { unique: true }
);

productSchema.index({
  name: 'text',
  barcode: 'text',
  sku: 'text'
});

productSchema.pre('save', function updateInventoryFields(next) {
  const stock = Number(this.currentStock || 0);
  const costPrice = Number(this.costPrice || 0);
  const reorderLevel = Number(this.reorderLevel || 0);

  this.inventoryValue = stock * costPrice;

  if (this.status !== 'damaged') {
    if (stock === 0) {
      this.status = 'out_of_stock';
    } else if (stock <= reorderLevel) {
      this.status = 'low_stock';
    } else {
      this.status = 'normal';
    }
  }

  next();
});

export default mongoose.model(
  'Product',
  productSchema
);