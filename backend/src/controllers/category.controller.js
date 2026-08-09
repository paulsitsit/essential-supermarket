import Category from '../models/Category.js';
import Product from '../models/Product.js';

export async function list(req, res) {
  const categories = await Category.aggregate([{ $lookup: { from: 'products', localField: '_id', foreignField: 'category', as: 'products' } }, { $project: { name: 1, description: 1, status: 1, createdAt: 1, productCount: { $size: '$products' }, totalQuantity: { $sum: '$products.currentStock' } } }, { $sort: { name: 1 } }]);
  res.json(categories);
}
export async function create(req, res) { res.status(201).json(await Category.create(req.body)); }
export async function update(req, res) { const item = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Category not found' }); res.json(item); }
export async function remove(req, res) { if (await Product.exists({ category: req.params.id, isArchived: false })) return res.status(409).json({ message: 'Cannot delete a category assigned to products' }); await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Category deleted' }); }