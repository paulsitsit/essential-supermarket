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
    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
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
    product.branch?.name ||
      product.branch ||
      ''
  ]);

  const csvContent = [
    headers,
    ...csvRows
  ]
    .map(row =>
      row.map(escapeCsvValue).join(',')
    )
    .join('\n');

  const blob = new Blob(
    [csvContent],
    {
      type: 'text/csv;charset=utf-8;'
    }
  );

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
  const [categories, setCategories] =
    useState([]);
  const [suppliers, setSuppliers] =
    useState([]);
  const [filters, setFilters] = useState(
    initialFilters
  );

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

  const [exporting, setExporting] =
    useState(false);

  const [cacheInfo, setCacheInfo] =
    useState(null);

  /*
   * General catalog-changing actions remain
   * read-only while showing cached data.
   *
   * Do not include !isOnline here: offline
   * Receive Stock is intentionally allowed
   * through the dedicated stock receipt outbox.
   */
  const readOnly =
    Boolean(cacheInfo) ||
    loading ||
    Boolean(error);

  /*
   * Receiving stock can use a cached product
   * record while offline. The modal will save
   * a receipt locally and synchronize it later.
   */
  const canReceiveStock =
    !loading &&
    !error &&
    products.length > 0;

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
        cachedGet(
          `/products?${query.toString()}`
        ),
        cachedGet('/categories'),
        cachedGet('/suppliers')
      ]);

      if (
        requestId !== requestSequence.current
      ) {
        return;
      }

      const sort = filters.sort;

      const rows = [
        ...productRes.data
      ].sort((a, b) =>
        sort === 'name'
          ? String(a.name || '').localeCompare(
              String(b.name || '')
            )
          : sort === 'currentStock'
            ? Number(a.currentStock || 0) -
              Number(b.currentStock || 0)
            : sort === 'inventoryValue'
              ? Number(b.inventoryValue || 0) -
                Number(a.inventoryValue || 0)
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
    if (readOnly || !isOnline) {
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
    if (readOnly || !isOnline) {
      setError(
        'Connect and load fresh data before changing products.'
      );

      return;
    }

    const product = confirm?.product;

    if (!product) {
      return;
    }

    const productId =
      product._id ||
      product.id;

    if (!productId) {
      setError(
        'This product does not have a valid server ID.'
      );

      return;
    }

    try {
      await client.patch(
        `/products/${productId}/archive`
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
    if (readOnly || !isOnline) {
      setError(
        'Connect and load fresh data before changing products.'
      );

      return;
    }

    const product = confirm?.product;

    if (!product) {
      return;
    }

    const productId =
      product._id ||
      product.id;

    if (!productId) {
      setError(
        'This product does not have a valid server ID.'
      );

      return;
    }

    try {
      await client.delete(
        `/products/${productId}`
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
    if (!product) {
      return;
    }

    if (!canReceiveStock) {
      setError(
        'Wait for product data to finish loading before receiving stock.'
      );

      return;
    }

    const productId =
      product._id ||
      product.id;

    if (!productId) {
      setError(
        'This product has not synchronized with the server yet. Connect to the internet and wait for the product draft to synchronize before receiving stock.'
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
            Manage registered products and inventory
            details.
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
                readOnly ||
                !isOnline
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
            style={{
              marginLeft: 10
            }}
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
          ).toLocaleString()}
          . Catalog changes are unavailable while
          using saved data. You can still save a
          Receive Stock receipt on this device for
          synchronization after reconnecting.
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
            allowOfflineReceive
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

      {selectedProduct && (
        <ReceiveStockModal
          product={selectedProduct}
          onClose={() =>
            setSelectedProduct(null)
          }
          onSaved={() => {
            setSelectedProduct(null);

            /*
             * Online receipts update server stock,
             * so refresh. Offline drafts remain
             * pending and do not change shared stock
             * until synchronization completes.
             */
            if (isOnline) {
              load();
            }
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
            if (!product) {
              return;
            }

            if (!canReceiveStock) {
              setError(
                'Wait for product data to finish loading before receiving stock.'
              );

              return;
            }

            const productId =
              product._id ||
              product.id;

            if (!productId) {
              setError(
                'This product has not synchronized with the server yet. Connect to the internet and wait for synchronization before receiving stock.'
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