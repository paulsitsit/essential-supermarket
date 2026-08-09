import { CheckCircle2, PackageSearch, RotateCcw } from 'lucide-react';

export default function ScannedProductCard({
  product,
  notFoundCode,
  onReceive,
  onScanAgain
}) {
  if (!product && !notFoundCode) {
    return null;
  }

  if (notFoundCode) {
    return (
      <div className="not-found-result">
        <PackageSearch size={38} />

        <h3>Product not found</h3>

        <p>
          No registered product was found for code:
        </p>

        <strong>{notFoundCode}</strong>

        <button
          type="button"
          className="secondary-btn"
          onClick={onScanAgain}
        >
          <RotateCcw size={15} />
          Scan again
        </button>
      </div>
    );
  }

  const productCode =
    product.productCode ||
    product.code ||
    product.sku ||
    product.barcode ||
    'Not available';

  const categoryName =
    product.category?.name ||
    product.category ||
    'Not available';

  const supplierName =
    product.supplier?.name ||
    product.supplier ||
    'Not available';

  return (
    <div className="scan-result">
      <div className="scan-product-heading">
        <div className="product-avatar large-product-avatar">
          {product.name?.charAt(0)?.toUpperCase() || 'P'}
        </div>

        <div>
          <h3>{product.name || 'Product found'}</h3>
          <span>{productCode}</span>
        </div>
      </div>

      <div className="scan-details">
        <div>
          <span>Barcode</span>
          <strong>{product.barcode || 'Not available'}</strong>
        </div>

        <div>
          <span>SKU</span>
          <strong>{product.sku || 'Not available'}</strong>
        </div>

        <div>
          <span>Category</span>
          <strong>{categoryName}</strong>
        </div>

        <div>
          <span>Supplier</span>
          <strong>{supplierName}</strong>
        </div>

        <div>
          <span>Current stock</span>
          <strong>{product.currentStock ?? 0}</strong>
        </div>

        <div>
          <span>Reorder level</span>
          <strong>{product.reorderLevel ?? 0}</strong>
        </div>
      </div>

      <div className="scan-status">
        <span>Status</span>

        <span
          className={`status-badge status-${
            product.status || 'normal'
          }`}
        >
          {String(product.status || 'normal').replaceAll('_', ' ')}
        </span>
      </div>

      <div className="scan-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={() => onReceive(product)}
        >
          <CheckCircle2 size={16} />
          Receive stock
        </button>

        <button
          type="button"
          className="secondary-btn"
          onClick={onScanAgain}
        >
          <RotateCcw size={16} />
          Scan again
        </button>
      </div>
    </div>
  );
}