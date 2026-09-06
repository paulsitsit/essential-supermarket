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

/*
 * POS scanner lookup
 *
 * Cashiers may access only this read-only endpoint so they can:
 * - Scan a barcode or QR code
 * - Receive product name, sale price, and availability
 * - Add the product to the separate POS cart
 *
 * Keep this route before "/:id" so Express does not treat
 * "scan" as a product ID.
 */
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

/*
 * Inventory-management product list.
 * Cashier is intentionally excluded.
 */
router.get(
  '/',
  allowRoles('admin', 'manager', 'staff'),
  listProducts
);

/*
 * External product lookup is for product setup, not checkout.
 */
router.get(
  '/lookup/:barcode',
  allowRoles('admin', 'manager', 'staff'),
  lookupExternalProduct
);

/*
 * Image recognition is for inventory/product setup only.
 */
router.post(
  '/recognize',
  allowRoles('admin', 'manager', 'staff'),
  uploadProductImage,
  recognizeProduct
);

/*
 * Batch details expose operational inventory data.
 * Cashier is intentionally excluded.
 */
router.get(
  '/:id/batches',
  allowRoles('admin', 'manager', 'staff'),
  productIdRules,
  validateRequest,
  getProductBatches
);

/*
 * Direct product lookup is an inventory endpoint.
 * Cashier should only use /scan/:barcode from POS.
 */
router.get(
  '/:id',
  allowRoles('admin', 'manager', 'staff'),
  productIdRules,
  validateRequest,
  getProduct
);

/*
 * Product management is Admin only.
 */
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