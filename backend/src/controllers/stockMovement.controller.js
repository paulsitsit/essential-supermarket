import StockMovement from '../models/StockMovement.js';
import { applyMovement } from '../services/inventory.service.js';

export async function listMovements(req, res) {
  const filter = req.account.role === 'staff' ? { account: req.account._id } : {};
  if (req.query.product) filter.product = req.query.product;
  if (req.query.movementType) filter.movementType = req.query.movementType;
  const movements = await StockMovement.find(filter).populate('product', 'name barcode sku').populate('account', 'fullName role').sort({ createdAt: -1 });
  res.json(movements);
}

export async function createMovement(req, res) {
  const { productId, movementType = 'stock_in', quantityChanged, reason } = req.body;
  if (!productId || quantityChanged === undefined || !reason) return res.status(400).json({ message: 'productId, quantityChanged, and reason are required' });
  const result = await applyMovement({ productId, account: req.account, movementType, quantityChanged, reason, req, io: req.app.get('io') });
  res.status(201).json(result);
}