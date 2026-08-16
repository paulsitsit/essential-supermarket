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

router.get('/', listProducts);

router.get(
  '/scan/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  scanProduct
);

router.get(
  '/lookup/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  lookupExternalProduct
);

// NEW: recognize product from photo using Hugging Face (labels only)
router.post(
  '/recognize',
  allowRoles('admin', 'manager', 'staff'),
  uploadProductImage,
  recognizeProduct
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