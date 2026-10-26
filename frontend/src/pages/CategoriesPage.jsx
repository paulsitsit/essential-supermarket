import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  PackageOpen,
  RefreshCw,
  X
} from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import EmptyState from '../components/common/EmptyState';
import ManagementTable from '../components/management/ManagementTable';
import CategoryForm from '../components/management/CategoryForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getErrorMessage } from '../utils/errors';
import { downloadServerReport } from '../utils/serverExport';
import './CategoriesPage.css';

export default function CategoriesPage() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [exportingFormat, setExportingFormat] = useState('');

  // Desktop category cards show only the first row until expanded.
  // Mobile always keeps every category visible.
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [firstRowCategoryCount, setFirstRowCategoryCount] = useState(1);
  const categoryMeasureRef = useRef(null);
  const productsRequest = useRef(0);

  async function load() {
    setLoadingCategories(true);
    setError('');
    try {
      const { data } = await client.get('/categories');
      const categories = Array.isArray(data) ? data : [];
      setRows(categories);
      setSelectedCategory(current => {
        if (!current) return current;
        return categories.find(item => item._id === current._id) || null;
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load categories.'));
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      productsRequest.current += 1;
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (mobile) setCategoriesExpanded(false);
    };

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => {
      mediaQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  useLayoutEffect(() => {
    if (loadingCategories || !rows.length) {
      setFirstRowCategoryCount(1);
      return undefined;
    }

    function measureFirstRow() {
      const grid = categoryMeasureRef.current;
      if (!grid) return;

      const cards = Array.from(grid.children);
      if (!cards.length) {
        setFirstRowCategoryCount(1);
        return;
      }

      const firstTop = Math.round(cards[0].getBoundingClientRect().top);
      const count = cards.filter(card =>
        Math.abs(Math.round(card.getBoundingClientRect().top) - firstTop) <= 2
      ).length;

      setFirstRowCategoryCount(Math.max(1, count));
    }

    measureFirstRow();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measureFirstRow)
        : null;

    if (categoryMeasureRef.current) {
      observer?.observe(categoryMeasureRef.current);
    }

    window.addEventListener('resize', measureFirstRow);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measureFirstRow);
    };
  }, [rows, loadingCategories]);

  async function openCategory(category) {
    const requestId = ++productsRequest.current;
    setSelectedCategory(category);
    setCategoryProducts([]);
    setProductsError('');
    setLoadingProducts(true);
    try {
      const query = new URLSearchParams({ category: category._id });
      const { data } = await client.get(`/products?${query.toString()}`);
      if (requestId === productsRequest.current) {
        setCategoryProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (requestId === productsRequest.current) {
        setProductsError(getErrorMessage(err, 'Unable to load products in this category.'));
      }
    } finally {
      if (requestId === productsRequest.current) setLoadingProducts(false);
    }
  }

  async function remove() {
    if (!confirm) return;
    try {
      await client.delete(`/categories/${confirm._id}`);
      if (selectedCategory?._id === confirm._id) {
        productsRequest.current += 1;
        setSelectedCategory(null);
        setCategoryProducts([]);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirm(null);
    }
  }

  async function exportCategoryReport(format) {
    if (!selectedCategory || exportingFormat) return;

    setExportingFormat(format);
    setProductsError('');

    try {
      await downloadServerReport(
        'category-products',
        format,
        { category: selectedCategory._id }
      );
    } catch (err) {
      setProductsError(
        getErrorMessage(
          err,
          `Unable to export the ${format.toUpperCase()} category report.`
        )
      );
    } finally {
      setExportingFormat('');
    }
  }

  const columns = [
    { key: 'name', label: 'Category', render: row => <strong>{row.name}</strong> },
    { key: 'description', label: 'Description' },
    { key: 'productCount', label: 'Products' },
    { key: 'totalQuantity', label: 'Total quantity' },
    { key: 'status', label: 'Status', render: row => <span className={`simple-status ${row.status}`}>{row.status}</span> },
    { key: 'createdAt', label: 'Created' }
  ];

  const totalStock = categoryProducts.reduce(
    (total, product) => total + (Number(product.currentStock) || 0),
    0
  );

  const visibleCategories =
    isMobile || categoriesExpanded
      ? rows
      : rows.slice(0, firstRowCategoryCount);

  const hasMoreCategories =
    !isMobile && rows.length > firstRowCategoryCount;

  function renderCategoryCard(category, measureOnly = false) {
    return (
      <button
        type="button"
        key={category._id}
        tabIndex={measureOnly ? -1 : undefined}
        className={`category-overview-card${selectedCategory?._id === category._id ? ' selected' : ''}`}
        onClick={() => {
          if (!measureOnly) openCategory(category);
        }}
        aria-pressed={!measureOnly && selectedCategory?._id === category._id}
      >
        <span className="category-card-icon"><PackageOpen size={23} /></span>
        <span className="category-card-main">
          <strong>{category.name}</strong>
          <small>{category.description || 'No description provided'}</small>
        </span>
        <span className="category-card-metrics">
          <span><strong>{Number(category.productCount || 0)}</strong><small>Products</small></span>
          <span><strong>{Number(category.totalQuantity || 0).toLocaleString()}</strong><small>Units in stock</small></span>
        </span>
        <span className={`category-card-status ${category.status === 'active' ? 'active' : 'inactive'}`}>
          {category.status || 'active'}
        </span>
      </button>
    );
  }

  return (
    <div className="categories-page">
      <div className="page-heading category-screen-only">
        <div>
          <p className="eyebrow">PRODUCT ORGANIZATION</p>
          <h1>Categories</h1>
          <p>Choose a category to view its products, stock totals, and reports.</p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Boxes size={17} /> Add Category
        </button>
      </div>

      {error && <div className="form-error page-message category-screen-only">{error}</div>}

      <section className="category-card-section category-screen-only">
        <div className="category-section-heading">
          <div>
            <h2>Browse Categories</h2>
            <p>Cards update automatically when categories are created or edited.</p>
          </div>
          <span className="category-count-badge">{rows.length} {rows.length === 1 ? 'category' : 'categories'}</span>
        </div>

        {loadingCategories ? (
          <div className="page-loading">Loading categories...</div>
        ) : rows.length ? (
          <>
            <div className="category-card-grid">
              {visibleCategories.map(category => renderCategoryCard(category))}
            </div>

            {/* Hidden duplicate grid measures how many cards fit in the first row. */}
            {!isMobile && (
              <div
                ref={categoryMeasureRef}
                className="category-card-grid category-card-grid-measure"
                aria-hidden="true"
              >
                {rows.map(category => renderCategoryCard(category, true))}
              </div>
            )}

            {hasMoreCategories && (
              <div className="category-card-toggle-wrap">
                <button
                  type="button"
                  className={`category-card-toggle${categoriesExpanded ? ' category-card-toggle-expanded' : ''}`}
                  onClick={() => setCategoriesExpanded(current => !current)}
                  aria-expanded={categoriesExpanded}
                  aria-label={categoriesExpanded ? 'Show fewer categories' : 'Show all categories'}
                  title={categoriesExpanded ? 'Show fewer categories' : 'Show all categories'}
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            )}
          </>
        ) : (
          <GlassCard><EmptyState title="No categories yet" description="Add a category to create your first category card." /></GlassCard>
        )}
      </section>

      {selectedCategory && (
        <section className="category-report-section">

          <div className="category-report-toolbar category-screen-only">
            <div className="category-report-title">
              <span className="category-card-icon"><PackageOpen size={21} /></span>
              <div>
                <p className="eyebrow">CATEGORY DETAILS</p>
                <h2>{selectedCategory.name}</h2>
                <p>{selectedCategory.description || 'No description provided'}</p>
              </div>
            </div>
            <div className="heading-actions">
              <button type="button" className="secondary-btn" onClick={() => openCategory(selectedCategory)} disabled={loadingProducts}>
                <RefreshCw size={15} /> Refresh
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => exportCategoryReport('pdf')}
                disabled={loadingProducts || Boolean(productsError) || categoryProducts.length === 0 || Boolean(exportingFormat)}
              >
                <FileText size={15} />
                {exportingFormat === 'pdf' ? 'Exporting PDF...' : 'PDF Report'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => exportCategoryReport('xlsx')}
                disabled={loadingProducts || Boolean(productsError) || categoryProducts.length === 0 || Boolean(exportingFormat)}
              >
                <FileSpreadsheet size={15} />
                {exportingFormat === 'xlsx' ? 'Exporting Excel...' : 'Excel Report'}
              </button>
              <button type="button" className="row-icon" aria-label="Close category report" title="Close" onClick={() => { productsRequest.current += 1; setSelectedCategory(null); setCategoryProducts([]); }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {productsError && <div className="form-error category-screen-only">{productsError}</div>}

          <div className="category-report-metrics">
            <article><span>Products in category</span><strong>{loadingProducts ? '…' : categoryProducts.length}</strong></article>
            <article><span>Total units in stock</span><strong>{loadingProducts ? '…' : totalStock.toLocaleString()}</strong></article>
            <article><span>Low / out of stock</span><strong>{loadingProducts ? '…' : categoryProducts.filter(product => ['low_stock', 'out_of_stock'].includes(product.status)).length}</strong></article>
          </div>

          <GlassCard className="table-card category-products-card">
            {loadingProducts ? (
              <div className="page-loading">Loading {selectedCategory.name} products...</div>
            ) : productsError ? (
              <EmptyState title="Products could not be loaded" description="Refresh the category report to try again." />
            ) : categoryProducts.length ? (
              <div className="table-wrap">
                <table className="data-table category-products-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Barcode</th><th>Supplier</th><th>Current stock</th><th>Reorder level</th><th>Status</th></tr></thead>
                  <tbody>
                    {categoryProducts.map(product => (
                      <tr key={product._id}>
                        <td><strong>{product.name || 'Unnamed product'}</strong><small className="table-subtext">{product.brand || ''}</small></td>
                        <td>{product.sku || '—'}</td>
                        <td>{product.barcode || '—'}</td>
                        <td>{product.supplier?.name || '—'}</td>
                        <td>{Number(product.currentStock || 0).toLocaleString()} {product.unitType || 'piece'}</td>
                        <td>{Number(product.reorderLevel || 0).toLocaleString()}</td>
                        <td><span className={`status-badge ${`status-${product.status || 'normal'}`}`}>{String(product.status || 'normal').replaceAll('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No products in this category" description="Products assigned to this category will appear here. The category card remains available." />
            )}
          </GlassCard>
        </section>
      )}

      <section className="category-management-section category-screen-only">
        <div className="category-section-heading">
          <div><h2>Manage Categories</h2><p>Edit category details or remove an unused category.</p></div>
        </div>
        <GlassCard className="table-card">
          <ManagementTable
            columns={columns}
            rows={rows}
            onEdit={row => { setEditing(row); setFormOpen(true); }}
            onDelete={setConfirm}
            empty="No categories have been created."
          />
        </GlassCard>
      </section>

      {formOpen && (
        <div className="modal-backdrop category-screen-only">
          <div className="modal-card management-modal">
            <div className="modal-header"><h3>{editing ? 'Edit category' : 'Create category'}</h3></div>
            <CategoryForm
              category={editing}
              onCancel={() => setFormOpen(false)}
              onSaved={() => { setFormOpen(false); load(); }}
            />
          </div>
        </div>
      )}

      <div className="category-screen-only">
        <ConfirmDialog
          open={Boolean(confirm)}
          title="Delete category?"
          message={`Delete ${confirm?.name || 'this category'}? Categories assigned to products cannot be deleted.`}
          onCancel={() => setConfirm(null)}
          onConfirm={remove}
          danger
          confirmText="Delete"
        />
      </div>
    </div>
  );
}
