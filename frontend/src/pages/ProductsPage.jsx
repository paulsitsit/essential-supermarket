import {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Download,
  Plus
} from 'lucide-react';

import {
  Link
} from 'react-router-dom';

import client from '../api/client';

import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ProductFilters from '../components/inventory/ProductFilters';
import ProductTable from '../components/inventory/ProductTable';
import ReceiveStockModal from '../components/inventory/ReceiveStockModal';
import ProductDetailsModal from '../components/inventory/ProductDetailsModal';

import {
  useAuth
} from '../context/AuthContext';

import {
  getErrorMessage
} from '../utils/errors';

import {
  cachedGet
} from '../services/offlineCache';

import {
  useOnlineStatus
} from '../hooks/useOnlineStatus';

const initialFilters = {
  search: '',
  category: '',
  supplier: '',
  status: '',
  sort: 'updatedAt',
  page: 1
};

function escapeCsvValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
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

  const isOnline = useOnlineStatus();

  const requestSequence = useRef(0);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);

  const [
    selectedProduct,
    setSelectedProduct
  ] = useState(null);

  const [
    detailsProduct,
    setDetailsProduct
  ] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);

  const readOnly =
    !isOnline ||
    Boolean(cacheInfo) ||
    loading ||
    Boolean(error);

  async function load() {
    const requestId =
      ++requestSequence.current;

    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(
          ([, value]) => value
        )
      );

      const [
        productRes,
        categoryRes,
        supplierRes
      ] = await Promise.all([
        cachedGet(`/products?${query.toString()}`),
        cachedGet('/categories'),
        cachedGet('/suppliers')
      ]);

      if (
        requestId !== requestSequence.current
      ) {
        return;
      }

      const sort = filters.sort;

      const rows = [...productRes.data].sort(
        (a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'currentStock'
              ? a.currentStock - b.currentStock
              : sort === 'inventoryValue'
                ? b.inventoryValue - a.inventoryValue
                : new Date(b.updatedAt) -
                  new Date(a.updatedAt)
      );

      setProducts(rows);
      setCategories(categoryRes.data);
      setSuppliers(supplierRes.data);

      setCacheInfo(
        productRes.cached
          ? {
              savedAt: productRes.savedAt
            }
          : null
      );
    } catch (err) {
      if (
        requestId !== requestSequence.current
      ) {
        return;
      }

      setError(
        getErrorMessage(
          err,
          'Unable to load products'
        )
      );
    } finally {
      if (
        requestId === requestSequence.current
      ) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    load();

    return () => {
      requestSequence.current += 1;
    };
  }, [
    filters.search,
    filters.category,
    filters.supplier,
    filters.status,
    filters.sort,
    filters.page,
    isOnline
  ]);

  async function exportInventory() {
    if (readOnly) {
      setError(
        'Connect and load fresh data before exporting inventory.'
      );

      return;
    }

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
        {
          params
        }
      );

      const rows =
        response.data?.rows || [];

      if (!rows.length) {
        setError(
          'There are no inventory records to export.'
        );

        return;
      }

      downloadCsv(
        'inventory-report.csv',
        rows
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to export inventory'
        )
      );
    } finally {
      setExporting(false);
    }
  }

  async function archive() {
    if (readOnly) {
      setError(
        'Connect and load fresh data before changing products.'
      );

      return;
    }

    const product = confirm?.product;

    if (!product) {
      return;
    }

    try {
      await client.patch(
        `/products/${product._id}/archive`
      );

      setConfirm(null);

      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to archive product'
        )
      );
    }
  }

  async function remove() {
    if (readOnly) {
      setError(
        'Connect and load fresh data before changing products.'
      );

      return;
    }

    const product = confirm?.product;

    if (!product) {
      return;
    }

    try {
      await client.delete(
        `/products/${product._id}`
      );

      setConfirm(null);

      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to delete product'
        )
      );
    }
  }

  function receive(product) {
    if (readOnly) {
      setError(
        'Stock receiving requires a connection and fresh data.'
      );

      return;
    }

    setSelectedProduct(product);
  }

  const isDeleteAction =
    confirm?.action === 'delete';

  const confirmedProduct =
    confirm?.product;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            CATALOG
          </p>

          <h1>
            Products
          </h1>

          <p>
            Manage registered products and inventory details.
          </p>
        </div>

        <div className="heading-actions">
          {['admin', 'manager'].includes(
            account?.role
          ) && (
            <button
              type="button"
              className="secondary-btn"
              onClick={exportInventory}
              disabled={
                exporting ||
                readOnly
              }
            >
              <Download size={16} />

              {exporting
                ? 'Exporting...'
                : 'Export'}
            </button>
          )}

          {account?.role === 'admin' && (
            <>
              <Link
                className="secondary-btn"
                to="/pending-products"
              >
                Pending Products
              </Link>

              <Link
                className="secondary-btn"
                to="/pending-stock-receipts"
              >
                Pending Stock
              </Link>

              <Link
                className="primary-btn"
                to="/products/new"
              >
                <Plus size={17} />
                Add Product
              </Link>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="form-error page-message">
          {error}

          <button
            type="button"
            className="secondary-btn"
            onClick={load}
            disabled={loading}
            style={{ marginLeft: 10 }}
          >
            Retry
          </button>
        </div>
      )}

      {cacheInfo && (
        <div
          className="inventory-cache-notice"
          role="status"
        >
          Showing saved product data from{' '}
          {new Date(
            cacheInfo.savedAt
          ).toLocaleString()}.
          {' '}
          Stock actions are unavailable. Admin
          catalog edits can be saved as local drafts
          while offline.
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
            readOnly={readOnly}
            onView={setDetailsProduct}
            onReceive={receive}
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

      {selectedProduct && !readOnly && (
        <ReceiveStockModal
          product={selectedProduct}
          onClose={() =>
            setSelectedProduct(null)
          }
          onSaved={() => {
            setSelectedProduct(null);
            load();
          }}
        />
      )}

      {detailsProduct && (
        <ProductDetailsModal
          product={detailsProduct}
          onClose={() =>
            setDetailsProduct(null)
          }
          onReceive={product => {
            if (readOnly) {
              setError(
                'Stock receiving requires a connection and fresh data.'
              );

              return;
            }

            setDetailsProduct(null);
            setSelectedProduct(product);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          isDeleteAction
            ? 'Delete product?'
            : 'Archive product?'
        }
        message={
          confirmedProduct
            ? `Are you sure you want to ${
                isDeleteAction
                  ? 'delete'
                  : 'archive'
              } ${confirmedProduct.name}?`
            : ''
        }
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={
          isDeleteAction
            ? remove
            : archive
        }
        confirmText={
          isDeleteAction
            ? 'Delete'
            : 'Archive'
        }
      />
    </div>
  );
}