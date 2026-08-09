import mongoose from 'mongoose';


const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  barcode: { type: String, required: true, trim: true, uppercase: true },
  sku: { type: String, required: true, trim: true, uppercase: true },
  qrCode: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  brand: { type: String, trim: true },
  description: { type: String, trim: true },
  imageUrl: String,
  unitType: { type: String, default: 'piece', trim: true },
  branch: { type: String, default: 'Main Branch', trim: true },
  currentStock: { type: Number, min: 0, default: 0 },
  reorderLevel: { type: Number, min: 0, default: 10 },
  costPrice: { type: Number, min: 0, default: 0 },
  inventoryValue: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['normal', 'low_stock', 'out_of_stock', 'damaged', 'expired'], default: 'normal' },
  expirationDate: Date,
  isArchived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }
}, { timestamps: true, collection: 'products' });


productSchema.index({ barcode: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', barcode: 'text', sku: 'text' });


productSchema.pre('save', function (next) {
  this.inventoryValue = this.currentStock * this.costPrice;
  if (!['damaged', 'expired'].includes(this.status)) {
    if (this.currentStock === 0) this.status = 'out_of_stock';
    else if (this.currentStock <= this.reorderLevel) this.status = 'low_stock';
    else this.status = 'normal';
  }
  next();
});


export default mongoose.model('Product', productSchema);