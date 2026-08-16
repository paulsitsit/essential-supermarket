import StockMovement from '../models/StockMovement.js';
import {
  applyMovement
} from '../services/inventory.service.js';

export async function listMovements(req, res) {
  const filter =
    req.account.role === 'staff'
      ? {
          account: req.account._id
        }
      : {};

  if (req.query.product) {
    filter.product = req.query.product;
  }

  if (req.query.movementType) {
    filter.movementType = req.query.movementType;
  }

  const movements = await StockMovement.find(filter)
    .populate('product', 'name barcode sku')
    .populate('account', 'fullName role')
    .populate(
      'batchAllocations.batch',
      'batchNumber expirationDate quantity'
    )
    .sort({ createdAt: -1 });

  res.json(movements);
}

export async function createMovement(req, res) {
  const {
    productId,
    movementType = 'stock_in',
    quantityChanged,
    reason,
    expirationDate,
    batchNumber,
    receivedDate
  } = req.body;

  if (
    !productId ||
    quantityChanged === undefined ||
    !reason
  ) {
    return res.status(400).json({
      message:
        'productId, quantityChanged, and reason are required'
    });
  }

  if (
    movementType === 'stock_in' &&
    Number(quantityChanged) <= 0
  ) {
    return res.status(400).json({
      message:
        'Stock-in quantity must be greater than zero'
    });
  }

  const result = await applyMovement({
    productId,
    account: req.account,
    movementType,
    quantityChanged,
    reason,
    expirationDate,
    batchNumber,
    receivedDate,
    req,
    io: req.app.get('io')
  });

  res.status(201).json(result);
}