import { Router } from 'express';

import {
  listProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  scanProduct,
  getProductBatches,
  lookupExternalProduct,
  recognizeProduct,
  saveProductImage,
  uploadProductImage
} from '../controllers/product.controller.js';

import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';

import {
  productCreateRules,
  productIdRules
} from '../validators/product.validators.js';

import { validateRequest } from '../middleware/validation.js';

const router = Router();

router.use(protect);

router.get(
  '/scan/:barcode',
  allowRoles(
    'admin',
    'manager',
    'staff',
    'cashier'
  ),
  scanProduct
);

router.get(
  '/',
  allowRoles('admin', 'manager', 'staff'),
  listProducts
);

router.get(
  '/lookup/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  lookupExternalProduct
);

router.post(
  '/recognize',
  allowRoles('admin', 'manager', 'staff'),
  uploadProductImage,
  recognizeProduct
);

/*
 * Upload or replace a product photo after the product exists.
 *
 * Field name required by multer:
 * image
 */
router.post(
  '/:id/image',
  allowRoles('admin'),
  productIdRules,
  validateRequest,
  uploadProductImage,
  saveProductImage
);

router.get(
  '/:id/batches',
  allowRoles('admin', 'manager', 'staff'),
  productIdRules,
  validateRequest,
  getProductBatches
);

router.get(
  '/:id',
  allowRoles('admin', 'manager', 'staff'),
  productIdRules,
  validateRequest,
  getProduct
);

router.post(
  '/',
  allowRoles('admin'),
  productCreateRules,
  validateRequest,
  createProduct
);

router.put(
  '/:id',
  allowRoles('admin'),
  productIdRules,
  productCreateRules,
  validateRequest,
  updateProduct
);

router.patch(
  '/:id/archive',
  allowRoles('admin'),
  productIdRules,
  validateRequest,
  archiveProduct
);

router.delete(
  '/:id',
  allowRoles('admin'),
  productIdRules,
  validateRequest,
  deleteProduct
);

export default router;