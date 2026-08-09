import { useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ProductFilters from '../components/inventory/ProductFilters';
import ProductTable from '../components/inventory/ProductTable';
import ReceiveStockModal from '../components/inventory/ReceiveStockModal';
import ProductDetailsModal from '../components/inventory/ProductDetailsModal';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';

const initialFilters = {
  search: '',
  category: '',
  supplier: '',
  status: '',
  sort: 'updatedAt',
  page: 1
};

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadCsv(filename, rows) {
  const headers = [
    'Name',
    'SKU',
    'Barcode',
    'Category',
    'Supplier',
    'Status',
    'Current Stock',
    'Reorder Level',
    'Unit Price',
    'Inventory Value',
    'Branch'
  ];

  const csvRows = rows.map(product => [
    product.name,
    product.sku,
    product.barcode,
    product.category?.name || '',
    product.supplier?.name || '',
    product.status,
    product.currentStock,
    product.reorderLevel,
    product.unitPrice,
    product.inventoryValue,
    product.branch?.name || product.branch || ''
  ]);

  const csvContent = [
    headers,
    ...csvRows
  ]
    .map(row => row.map(escapeCsvValue).join(','))
    .join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  URL.revokeObjectURL(url);
}

export default function ProductsPage() {
  const { account } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value)
      );

      const [productRes, categoryRes, supplierRes] = await Promise.all([
        client.get(`/products?${query.toString()}`),
        client.get('/categories'),
        client.get('/suppliers')
      ]);

      let rows = productRes.data;
      const sort = filters.sort;

      rows = [...rows].sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : sort === 'currentStock'
            ? a.currentStock - b.currentStock
            : sort === 'inventoryValue'
              ? b.inventoryValue - a.inventoryValue
              : new Date(b.updatedAt) - new Date(a.updatedAt)
      );

      setProducts(rows);
      setCategories(categoryRes.data);
      setSuppliers(supplierRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load products'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [
    filters.search,
    filters.category,
    filters.supplier,
    filters.status,
    filters.sort
  ]);

  async function exportInventory() {
    setExporting(true);
    setError('');

    try {
      const params = {};

      if (filters.category) {
        params.category = filters.category;
      }

      if (filters.supplier) {
        params.supplier = filters.supplier;
      }

      if (filters.status) {
        params.status = filters.status;
      }

      const response = await client.get(
        '/reports/export/inventory',
        { params }
      );

      const rows = response.data?.rows || [];

      if (!rows.length) {
        setError('There are no inventory records to export.');
        return;
      }

      downloadCsv('inventory-report.csv', rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to export inventory'));
    } finally {
      setExporting(false);
    }
  }

  async function archive() {
    const product = confirm?.product;

    if (!product) {
      return;
    }

    try {
      await client.patch(`/products/${product._id}/archive`);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to archive product'));
    }
  }

  async function remove() {
    const product = confirm?.product;

    if (!product) {
      return;
    }

    try {
      await client.delete(`/products/${product._id}`);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete product'));
    }
  }

  const isDeleteAction = confirm?.action === 'delete';
  const confirmedProduct = confirm?.product;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CATALOG</p>
          <h1>Products</h1>
          <p>Manage registered products and inventory details.</p>
        </div>

        <div className="heading-actions">
          {['admin', 'manager'].includes(account?.role) && (
            <button
              type="button"
              className="secondary-btn"
              onClick={exportInventory}
              disabled={exporting}
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          )}

          {account?.role === 'admin' && (
            <Link className="primary-btn" to="/products/new">
              <Plus size={17} />
              Add Product
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <ProductFilters
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        suppliers={suppliers}
      />

      <GlassCard className="table-card">
        {loading ? (
          <div className="page-loading">
            Loading products...
          </div>
        ) : products.length ? (
          <ProductTable
            products={products}
            account={account}
            onView={setDetailsProduct}
            onReceive={setSelectedProduct}
            onArchive={product =>
              setConfirm({
                product,
                action: 'archive'
              })
            }
            onDelete={product =>
              setConfirm({
                product,
                action: 'delete'
              })
            }
          />
        ) : (
          <EmptyState
            title="No products found"
            description="Register a product or adjust your filters."
          />
        )}
      </GlassCard>

      {selectedProduct && (
        <ReceiveStockModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={() => {
            setSelectedProduct(null);
            load();
          }}
        />
      )}

      {detailsProduct && (
        <ProductDetailsModal
          product={detailsProduct}
          onClose={() => setDetailsProduct(null)}
          onReceive={product => {
            setDetailsProduct(null);
            setSelectedProduct(product);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={isDeleteAction ? 'Delete product?' : 'Archive product?'}
        message={
          confirmedProduct
            ? `Are you sure you want to ${
                isDeleteAction ? 'delete' : 'archive'
              } ${confirmedProduct.name}?`
            : ''
        }
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={isDeleteAction ? remove : archive}
        confirmText={isDeleteAction ? 'Delete' : 'Archive'}
      />
    </div>
  );
}