import {
  Archive,
  Eye,
  PackagePlus,
  Pencil,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import ProductQrCode from '../common/ProductQrCode.jsx';
import { peso, dateOnly } from '../../utils/format';

export default function ProductTable({
  products,
  account,
  onView,
  onReceive,
  onArchive,
  onDelete
}) {
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
          {products.map(product => (
            <tr key={product._id}>
              <td>
                <div className="table-product">
                  <div className="product-avatar">
                    {product.name?.charAt(0)}
                  </div>

                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      {product.brand || 'No brand'} · per {product.unitType}
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
                {product.category?.name || 'Uncategorized'}
              </td>

              <td>
                <strong>{product.currentStock}</strong>{' '}
                <small>{product.unitType}</small>
              </td>

              <td>{product.reorderLevel}</td>

              <td>{peso(product.costPrice)}</td>

              <td>{peso(product.inventoryValue)}</td>

              <td>
                <StatusBadge status={product.status} />
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
                    onClick={() => onView(product)}
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    type="button"
                    className="row-icon"
                    title="Add stock"
                    onClick={() => onReceive(product)}
                  >
                    <PackagePlus size={16} />
                  </button>

                  {account?.role === 'admin' && (
                    <>
                      <Link
                        className="row-icon"
                        title="Edit"
                        to={`/products/${product._id}/edit`}
                      >
                        <Pencil size={16} />
                      </Link>

                      <ProductQrCode
                        value={
                          product.qrCode ||
                          product.barcode ||
                          product.sku
                        }
                        productName={product.name}
                      />

                      <button
                        type="button"
                        className="row-icon warning-icon"
                        title="Archive"
                        onClick={() => onArchive(product)}
                      >
                        <Archive size={16} />
                      </button>

                      <button
                        type="button"
                        className="row-icon danger-icon"
                        title="Delete"
                        onClick={() => onDelete(product)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}