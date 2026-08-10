import { body, param } from 'express-validator';

export const productCreateRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 160 })
    .withMessage(
      'Product name cannot exceed 160 characters'
    ),

  /*
   * SKU is optional.
   * If blank, product.controller.js generates it.
   */
  body('sku')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 60 })
    .withMessage(
      'SKU cannot exceed 60 characters'
    ),

  body('barcode')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 80 })
    .withMessage(
      'Barcode cannot exceed 80 characters'
    ),

  body('qrCode')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 160 })
    .withMessage(
      'QR code cannot exceed 160 characters'
    ),

  body('brand')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 120 })
    .withMessage(
      'Brand cannot exceed 120 characters'
    ),

  body('description')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      'Description cannot exceed 2000 characters'
    ),

  body('imageUrl')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 500 })
    .withMessage(
      'Image URL cannot exceed 500 characters'
    ),

  body('unitType')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 40 })
    .withMessage(
      'Unit type cannot exceed 40 characters'
    ),

  body('branch')
    .optional({
      values: 'falsy'
    })
    .trim()
    .isLength({ max: 120 })
    .withMessage(
      'Branch cannot exceed 120 characters'
    ),

  body('currentStock')
    .optional({
      values: 'falsy'
    })
    .isFloat({
      min: 0
    })
    .withMessage(
      'Initial quantity cannot be negative'
    ),

  body('reorderLevel')
    .optional({
      values: 'falsy'
    })
    .isFloat({
      min: 0
    })
    .withMessage(
      'Reorder level cannot be negative'
    ),

  body('costPrice')
    .optional({
      values: 'falsy'
    })
    .isFloat({
      min: 0
    })
    .withMessage(
      'Cost price cannot be negative'
    ),

  body('expirationDate')
    .optional({
      values: 'falsy'
    })
    .isISO8601()
    .withMessage(
      'Expiration date must be a valid date'
    )
];

export const productIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID')
];