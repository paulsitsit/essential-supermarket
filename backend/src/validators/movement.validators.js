import { body } from 'express-validator';

export const movementRules = [
  body('productId')
    .isMongoId()
    .withMessage('A valid product is required'),

  body('movementType')
    .isIn([
      'stock_in',
      'stock_adjustment',
      'damaged',
      'expired',
      'returned_to_supplier',
      'branch_transfer',
      'manual_correction'
    ])
    .withMessage('Invalid movement type'),

  body('quantityChanged')
    .isFloat({
      min: -1000000,
      max: 1000000
    })
    .withMessage('Invalid quantity'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('A movement reason is required')
    .isLength({ max: 300 }),

  body('expirationDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Expiration date must be valid'),

  body('receivedDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Received date must be valid'),

  body('batchNumber')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'Batch number must be 100 characters or fewer'
    )
];