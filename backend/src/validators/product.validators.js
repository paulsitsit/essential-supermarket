import { body, param } from 'express-validator';

export const productCreateRules = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 160 }),
  body('sku').trim().notEmpty().withMessage('SKU is required').isLength({ max: 60 }),
  body('barcode').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('currentStock').optional().isFloat({ min: 0 }).withMessage('Initial quantity cannot be negative'),
  body('reorderLevel').optional().isFloat({ min: 0 }).withMessage('Reorder level cannot be negative'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price cannot be negative')
];

export const productIdRules = [param('id').isMongoId().withMessage('Invalid product ID')];