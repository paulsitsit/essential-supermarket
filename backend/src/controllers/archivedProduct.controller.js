import Product from '../models/Product.js';
import { writeAudit } from '../utils/audit.js';
import { createOrUpdateAlert } from '../services/inventory.service.js';

/**
 * List archived products for the archive management page.
 * Base64 image payloads are omitted to keep this response lightweight.
 */
export async function listArchivedProducts(req, res) {
  const products = await Product.find({ isArchived: true })
    .select('-legacyBase64Image')
    .populate('category supplier', 'name')
    .sort({ updatedAt: -1, name: 1 })
    .lean();

  for (const product of products) {
    if (
      typeof product.imageUrl === 'string' &&
      product.imageUrl.startsWith('data:image/')
    ) {
      product.imageUrl = '';
    }
  }

  res.json(products);
}

/**
 * Restore an archived product without deleting or recreating it.
 * The document save runs the Product model's inventory/status hooks.
 */
export async function restoreArchivedProduct(req, res) {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  if (!product.isArchived) {
    return res.status(409).json({
      message: 'This product is not archived'
    });
  }

  product.isArchived = false;
  await product.save();

  const io = req.app.get('io');

  // Reconcile the product's alert after restoration. A failure here should
  // not turn a successfully restored product into a failed HTTP response.
  try {
    await createOrUpdateAlert(
      product,
      req.account,
      req,
      io
    );
  } catch (alertError) {
    console.error(
      'Unable to synchronize low-stock alert after restoring product:',
      alertError
    );
  }

  await writeAudit({
    req,
    account: req.account,
    action: 'product_restored',
    affectedRecord: product._id.toString(),
    metadata: {
      sku: product.sku,
      barcode: product.barcode,
      currentStock: product.currentStock
    }
  });

  await product.populate('category supplier', 'name');

  io?.emit('productUpdated', product);

  return res.json({
    message: 'Product restored successfully',
    product
  });
}
