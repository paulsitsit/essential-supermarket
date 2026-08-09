import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';

export async function list(req, res) {
  const suppliers = await Supplier.aggregate([{ $lookup: { from: 'products', localField: '_id', foreignField: 'supplier', as: 'products' } }, { $project: { name: 1, contactPerson: 1, phone: 1, email: 1, address: 1, status: 1, createdAt: 1, productsSupplied: { $size: '$products' }, totalItemsSupplied: { $sum: '$products.currentStock' } } }, { $sort: { name: 1 } }]);
  res.json(suppliers);
}
export async function create(req, res) { res.status(201).json(await Supplier.create(req.body)); }
export async function update(req, res) { const item = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Supplier not found' }); res.json(item); }
export async function remove(req, res) { if (await Product.exists({ supplier: req.params.id, isArchived: false })) return res.status(409).json({ message: 'Cannot delete a supplier assigned to products' }); await Supplier.findByIdAndDelete(req.params.id); res.json({ message: 'Supplier deleted' }); }