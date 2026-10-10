import React from 'react';

import {
  Archive,
  Eye,
  ImageOff,
  PackagePlus,
  Pencil,
  Trash2
} from 'lucide-react';

import {
  Link
} from 'react-router-dom';

import StatusBadge from '../common/StatusBadge';
import ProductQrCode from '../common/ProductQrCode.jsx';

import {
  peso,
  dateOnly
} from '../../utils/format';

function getProductId(product) {
  return (
    product?._id ||
    product?.id ||
    ''
  );
}

function getProductImageUrl(product) {
  const imageUrl = String(
    product?.imageUrl ||
    product?.image_url ||
    ''
  ).trim();

  /*
   * Legacy Base64 product images can be multiple
   * megabytes each and make the product list slow.
   * Do not render them in the table.
   */
  if (
    !imageUrl ||
    imageUrl.startsWith('data:image/')
  ) {
    return '';
  }

  /*
   * Cloudinary thumbnails:
   * - 120px square crop for the table
   * - automatic format selection
   * - automatic quality optimization
   *
   * External Open Food Facts URLs stay unchanged.
   */
  if (
    imageUrl.includes(
      'res.cloudinary.com'
    ) &&
    imageUrl.includes('/upload/')
  ) {
    return imageUrl.replace(
      '/upload/',
      '/upload/f_auto,q_auto,w_120,h_120,c_fill/'
    );
  }

  return imageUrl;
}

function ProductTableImage({ product }) {
  const [
    imageFailed,
    setImageFailed
  ] = React.useState(false);

  const imageUrl =
    getProductImageUrl(product);

  const productName =
    String(product?.name || 'Product');

  React.useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (!imageUrl || imageFailed) {
    return (
      <div
        className="table-product-image table-product-image-fallback"
        title={`${productName} image unavailable`}
        aria-label={`${productName} image unavailable`}
      >
        <ImageOff size={15} />

        <span>
          {productName
            .charAt(0)
            .toUpperCase() || 'P'}
        </span>
      </div>
    );
  }

  return (
    <img
      className="table-product-image"
      src={imageUrl}
      alt={productName}
      loading="lazy"
      decoding="async"
      onError={() =>
        setImageFailed(true)
      }
    />
  );
}

export default function ProductTable({
  products = [],
  account,
  onView,
  onReceive,
  onArchive,
  onDelete,
  readOnly = false
}) {
  const safeProducts = Array.isArray(products)
    ? products.filter(
        product =>
          product &&
          typeof product === 'object'
      )
    : [];

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Barcode / SKU</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Reorder</th>
            <th>Cost price</th>
            <th>Inventory value</th>
            <th>Status</th>
            <th>Supplier</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {safeProducts.map(product => {
            const productId =
              getProductId(product);

            return (
              <tr
                key={
                  productId ||
                  `${product.name || 'product'}-${
                    product.barcode || product.sku || ''
                  }`
                }
              >
                <td>
                  <div className="table-product">
                    <ProductTableImage
                      product={product}
                    />

                    <div className="table-product-info">
                      <strong>
                        {product.name ||
                          'Unnamed product'}
                      </strong>

                      <small>
                        {product.brand ||
                          'No brand'}{' '}
                        · per{' '}
                        {product.unitType ||
                          'piece'}
                      </small>
                    </div>
                  </div>
                </td>

                <td>
                  <strong className="mono-text">
                    {product.barcode || '—'}
                  </strong>

                  <small className="table-subtext">
                    {product.sku || 'No SKU'}
                  </small>
                </td>

                <td>
                  {product.category?.name ||
                    'Uncategorized'}
                </td>

                <td>
                  <strong>
                    {product.currentStock ?? 0}
                  </strong>{' '}

                  <small>
                    {product.unitType || 'piece'}
                  </small>
                </td>

                <td>
                  {product.reorderLevel ?? 0}
                </td>

                <td>
                  {peso(product.costPrice)}
                </td>

                <td>
                  {peso(
                    product.inventoryValue ??
                      Number(
                        product.currentStock || 0
                      ) *
                        Number(
                          product.costPrice || 0
                        )
                  )}
                </td>

                <td>
                  <StatusBadge
                    status={product.status}
                  />
                </td>

                <td>
                  {product.supplier?.name || '—'}
                </td>

                <td>
                  {dateOnly(product.updatedAt)}
                </td>

                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="row-icon"
                      title="View"
                      onClick={() =>
                        onView?.(product)
                      }
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      className="row-icon"
                      title={
                        readOnly
                          ? 'Unavailable in cached view'
                          : 'Add stock'
                      }
                      disabled={readOnly}
                      onClick={() =>
                        onReceive?.(product)
                      }
                    >
                      <PackagePlus size={16} />
                    </button>

                    {account?.role === 'admin' && (
                      <>
                        {productId ? (
                          <Link
                            className="row-icon"
                            title={
                              readOnly
                                ? 'Open editor; offline saves remain local'
                                : 'Edit'
                            }
                            to={`/products/${productId}/edit`}
                          >
                            <Pencil size={16} />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="row-icon"
                            disabled
                            title="This local product has not synchronized yet"
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        <ProductQrCode
                          value={
                            product.qrCode ||
                            product.barcode ||
                            product.sku
                          }
                          productName={
                            product.name ||
                            'Product'
                          }
                        />

                        <button
                          type="button"
                          className="row-icon warning-icon"
                          title={
                            readOnly
                              ? 'Unavailable in cached view'
                              : 'Archive'
                          }
                          disabled={readOnly}
                          onClick={() =>
                            onArchive?.(product)
                          }
                        >
                          <Archive size={16} />
                        </button>

                        <button
                          type="button"
                          className="row-icon danger-icon"
                          title={
                            readOnly
                              ? 'Unavailable in cached view'
                              : 'Delete'
                          }
                          disabled={readOnly}
                          onClick={() =>
                            onDelete?.(product)
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}