import { body } from 'express-validator';

export const movementRules = [
  body('productId').isMongoId().withMessage('A valid product is required'),
  body('movementType').isIn(['stock_in', 'stock_adjustment', 'damaged', 'expired', 'returned_to_supplier', 'branch_transfer', 'manual_correction']).withMessage('Invalid movement type'),
  body('quantityChanged').isFloat({ min: -1000000, max: 1000000 }).withMessage('Invalid quantity'),
  body('reason').trim().notEmpty().withMessage('A movement reason is required').isLength({ max: 300 })
];