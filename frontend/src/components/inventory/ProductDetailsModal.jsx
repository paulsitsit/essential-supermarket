import React from 'react';
import {
  ImageOff,
  X
} from 'lucide-react';

import ProductQrCode from '../common/ProductQrCode';
import StatusBadge from '../common/StatusBadge';
import { peso, dateTime } from '../../utils/format';

function ProductImage({ product }) {
  const [imageFailed, setImageFailed] =
    React.useState(false);

  const imageUrl =
    product?.imageUrl ||
    product?.image_url ||
    '';

  const productName =
    product?.name || 'Product';

  if (!imageUrl || imageFailed) {
    return (
      <div
        className="details-product-image details-product-image-fallback"
        aria-label={`${productName} image unavailable`}
      >
        <ImageOff size={34} />
        <span>
          {productName.charAt(0).toUpperCase() || 'P'}
        </span>
      </div>
    );
  }

  return (
    <img
      className="details-product-image"
      src={imageUrl}
      alt={productName}
      onError={() => setImageFailed(true)}
    />
  );
}

function DetailItem({ label, children }) {
  return (
    <div className="details-item">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export default function ProductDetailsModal({
  product,
  onClose,
  onReceive
}) {
  if (!product) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="modal-card details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              PRODUCT DETAILS
            </p>

            <h3 id="product-details-title">
              {product.name}
            </h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close product details"
          >
            <X size={20} />
          </button>
        </div>

        <div className="details-product-overview">
          <ProductImage product={product} />

          <div className="details-product-summary">
            <h4>{product.name}</h4>

            <p>
              {product.brand || 'No brand recorded'}
            </p>

            <span>
              {product.barcode || 'No barcode recorded'}
            </span>
          </div>
        </div>

        <div className="details-layout">
          <div className="details-information">
            <div className="details-grid">
              <DetailItem label="Barcode">
                {product.barcode || '—'}
              </DetailItem>

              <DetailItem label="SKU">
                {product.sku || '—'}
              </DetailItem>

              <DetailItem label="Category">
                {product.category?.name ||
                  'Uncategorized'}
              </DetailItem>

              <DetailItem label="Brand">
                {product.brand || '—'}
              </DetailItem>

              <DetailItem label="Current stock">
                {product.currentStock ?? 0}{' '}
                {product.unitType || 'piece'}
              </DetailItem>

              <DetailItem label="Reorder level">
                {product.reorderLevel ?? 0}
              </DetailItem>

              <DetailItem label="Cost price">
                {peso(product.costPrice)}
              </DetailItem>

              <DetailItem label="Inventory value">
                {peso(product.inventoryValue)}
              </DetailItem>

              <DetailItem label="Supplier">
                {product.supplier?.name || '—'}
              </DetailItem>

              <DetailItem label="Branch">
                {product.branch || '—'}
              </DetailItem>

              <DetailItem label="Expiration date">
                {product.expirationDate
                  ? new Date(
                      product.expirationDate
                    ).toLocaleDateString('en-PH')
                  : 'Not recorded'}
              </DetailItem>

              <DetailItem label="Last updated">
                {product.updatedAt
                  ? dateTime(product.updatedAt)
                  : '—'}
              </DetailItem>
            </div>

            <div className="details-status">
              <span>Status</span>

              <StatusBadge
                status={product.status}
              />
            </div>

            <div className="details-description">
              <span>Description</span>

              <p>
                {product.description ||
                  'No description provided.'}
              </p>
            </div>
          </div>

          <div className="details-qr-section">
            <p className="details-section-label">
              Product QR code
            </p>

            <ProductQrCode
              value={
                product.qrCode ||
                product.barcode ||
                product.sku
              }
              productName={product.name}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => onReceive?.(product)}
          >
            Add Stock
          </button>
        </div>
      </div>
    </div>
  );
}