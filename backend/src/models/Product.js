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
      default: false,
      index: true
    },

    /*
     * Used by offline product synchronization.
     *
     * The PWA stores the version seen when an admin
     * opened an edit form. The backend later compares
     * that saved version to the current product version
     * before applying an offline product edit.
     */
    syncVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1
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
  {
    barcode: 1
  },
  {
    unique: true
  }
);

productSchema.index(
  {
    sku: 1
  },
  {
    unique: true
  }
);

productSchema.index({
  name: 'text',
  barcode: 'text',
  sku: 'text'
});

/*
 * Runs when a product document is created or saved.
 *
 * Existing inventory calculation and low-stock status
 * logic are preserved exactly.
 */
productSchema.pre(
  'save',
  function updateInventoryFields(next) {
    const stock = Number(
      this.currentStock || 0
    );

    const costPrice = Number(
      this.costPrice || 0
    );

    const reorderLevel = Number(
      this.reorderLevel || 0
    );

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

    /*
     * New products begin at version 1.
     * Existing products saved through document.save()
     * increment their synchronization version.
     */
    if (!this.isNew && this.isModified()) {
      this.syncVersion =
        Number(this.syncVersion || 1) + 1;
    }

    next();
  }
);

/*
 * Your normal product update controller uses:
 *
 * Product.findByIdAndUpdate(...)
 *
 * That does not run pre('save'), so increment the
 * version at query level as well.
 */
productSchema.pre(
  'findOneAndUpdate',
  function incrementSyncVersion(next) {
    const update = this.getUpdate() || {};

    /*
     * Do not replace any existing increments created
     * by another controller/service.
     */
    update.$inc = {
      ...(update.$inc || {}),
      syncVersion: 1
    };

    this.setUpdate(update);

    next();
  }
);

export default mongoose.model(
  'Product',
  productSchema
);