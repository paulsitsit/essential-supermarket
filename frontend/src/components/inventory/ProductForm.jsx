import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ScanLine,
  X
} from 'lucide-react';

import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';
import CameraScanner from '../scanner/CameraScanner';

const emptyForm = {
  name: '',
  barcode: '',
  sku: '',
  qrCode: '',
  category: '',
  supplier: '',
  brand: '',
  description: '',
  unitType: 'piece',
  branch: 'Main Branch',
  currentStock: 0,
  reorderLevel: 10,
  costPrice: 0,
  sellingPrice: 0,
  expirationDate: '',
  imageUrl: ''
};

function formatDateInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toISOString().slice(0, 10);
}

function getInitialForm(initialProduct) {
  if (!initialProduct) {
    return { ...emptyForm };
  }

  return {
    ...emptyForm,
    ...initialProduct,
    category:
      initialProduct.category?._id ||
      initialProduct.category ||
      '',
    supplier:
      initialProduct.supplier?._id ||
      initialProduct.supplier ||
      '',
    costPrice: initialProduct.costPrice ?? 0,
    sellingPrice: initialProduct.sellingPrice ?? 0,
    expirationDate: formatDateInput(
      initialProduct.expirationDate
    )
  };
}

function getProductId(value) {
  if (!value) {
    return '';
  }

  return typeof value === 'object'
    ? value._id || ''
    : value;
}

function applyLocalProduct(
  product,
  currentForm,
  code
) {
  return {
    ...currentForm,
    name: product.name || currentForm.name,
    barcode: product.barcode || code,
    sku: product.sku || currentForm.sku,
    qrCode:
      product.qrCode ||
      product.barcode ||
      code,
    category:
      getProductId(product.category) ||
      currentForm.category,
    supplier:
      getProductId(product.supplier) ||
      currentForm.supplier,
    brand: product.brand || currentForm.brand,
    description:
      product.description ||
      currentForm.description,
    imageUrl:
      product.imageUrl ||
      currentForm.imageUrl ||
      '',
    unitType:
      product.unitType ||
      currentForm.unitType,
    branch:
      product.branch ||
      currentForm.branch,
    currentStock:
      product.currentStock ??
      currentForm.currentStock,
    reorderLevel:
      product.reorderLevel ??
      currentForm.reorderLevel,
    costPrice:
      product.costPrice ??
      currentForm.costPrice,
    sellingPrice:
      product.sellingPrice ??
      currentForm.sellingPrice,
    expirationDate:
      formatDateInput(product.expirationDate) ||
      currentForm.expirationDate
  };
}

function applyExternalProduct(
  product,
  currentForm,
  code
) {
  return {
    ...currentForm,
    name:
      product.productName ||
      product.name ||
      product.product_name ||
      currentForm.name,
    barcode:
      product.barcode ||
      product.code ||
      code,
    qrCode:
      product.qrCode ||
      product.barcode ||
      product.code ||
      code,
    brand:
      product.brand ||
      product.brands ||
      currentForm.brand,
    description:
      product.description ||
      product.genericName ||
      currentForm.description,
    imageUrl:
      product.imageUrl ||
      product.image_front_url ||
      currentForm.imageUrl ||
      '',
    sku: currentForm.sku,
    category: currentForm.category,
    supplier: currentForm.supplier,
    currentStock: currentForm.currentStock,
    reorderLevel: currentForm.reorderLevel,
    costPrice: currentForm.costPrice,
    sellingPrice: currentForm.sellingPrice,
    expirationDate: currentForm.expirationDate
  };
}

function getRecognizedProduct(data) {
  const product =
    data?.product ||
    data?.result ||
    data?.data ||
    data;

  if (!product || typeof product !== 'object') {
    return {};
  }

  return {
    name:
      product.productName ||
      product.name ||
      product.product_name ||
      '',
    brand:
      product.brand ||
      product.brandName ||
      '',
    category:
      product.category ||
      product.productType ||
      '',
    description:
      product.description ||
      product.genericName ||
      '',
    imageUrl:
      product.imageUrl ||
      product.image_url ||
      '',
    size:
      product.size ||
      product.quantity ||
      ''
  };
}

function money(value) {
  return Number(value || 0).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

export default function ProductForm({
  initialProduct,
  categories = [],
  suppliers = [],
  onSuccess
}) {
  const [form, setForm] = useState(
    getInitialForm(initialProduct)
  );

  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] =
    useState('');
  const [scanError, setScanError] =
    useState('');
  const [scannerOpen, setScannerOpen] =
    useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recognizing, setRecognizing] =
    useState(false);
  const [recognitionError, setRecognitionError] =
    useState('');

  useEffect(() => {
    setForm(getInitialForm(initialProduct));
  }, [initialProduct]);

  useEffect(() => {
    if (!form.qrCode && form.barcode) {
      setForm(current => ({
        ...current,
        qrCode: current.barcode
      }));
    }
  }, [form.barcode, form.qrCode]);

  function change(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }

  function clearScanMessage() {
    setScanMessage('');
    setScanError('');
  }

  async function lookupScannedCode(code) {
    const cleanCode = String(code || '').trim();

    if (!cleanCode || scanning) {
      return;
    }

    setScanning(true);
    clearScanMessage();

    try {
      let product;
      let source = 'local';

      try {
        const response = await client.get(
          `/products/scan/${encodeURIComponent(
            cleanCode
          )}`
        );

        product =
          response.data?.product ||
          response.data;
      } catch (localError) {
        if (localError.response?.status !== 404) {
          throw localError;
        }

        const response = await client.get(
          `/products/lookup/${encodeURIComponent(
            cleanCode
          )}`
        );

        product =
          response.data?.product ||
          response.data;

        source = 'openfoodfacts';
      }

      if (!product) {
        throw new Error(
          'No product information was returned.'
        );
      }

      setForm(current =>
        source === 'openfoodfacts'
          ? applyExternalProduct(
              product,
              current,
              cleanCode
            )
          : applyLocalProduct(
              product,
              current,
              cleanCode
            )
      );

      setScanMessage(
        source === 'openfoodfacts'
          ? 'Exact product information was found online. Review the fields before saving.'
          : 'Registered product found. The form was filled automatically.'
      );

      setScannerOpen(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setForm(current => ({
          ...current,
          barcode: cleanCode,
          qrCode:
            current.qrCode || cleanCode
        }));

        setScanMessage(
          'Product was not found online. The scanned code was added to the form. Complete the remaining fields manually.'
        );

        setScannerOpen(false);
      } else {
        setScanError(
          getErrorMessage(
            err,
            'Unable to look up this product'
          )
        );
      }
    } finally {
      setScanning(false);
    }
  }

  async function recognizeFromPhoto(file) {
    setRecognizing(true);
    setRecognitionError('');
    clearScanMessage();

    try {
      const formData = new FormData();

      formData.append('image', file);

      const response = await client.post(
        '/products/recognize',
        formData
      );

      const recognized = getRecognizedProduct(
        response.data
      );

      if (!recognized.name.trim()) {
        setRecognitionError(
          'The exact product name could not be read. Please take a clear photo of the front label, including the brand and product name.'
        );

        return;
      }

      setForm(current => ({
        ...current,
        name: recognized.name.trim(),
        brand:
          recognized.brand ||
          current.brand,
        description:
          [
            recognized.description,
            recognized.size
          ]
            .filter(Boolean)
            .join(' — ') ||
          current.description,
        imageUrl:
          recognized.imageUrl ||
          current.imageUrl
      }));

      setScanMessage(
        `Product identified as “${recognized.name.trim()}”. Review the fields before saving.`
      );
    } catch (err) {
      if (err.code === 'ERR_CANCELED') {
        return;
      }

      setRecognitionError(
        err.response?.data?.message ||
          getErrorMessage(
            err,
            'Failed to recognize product from photo'
          )
      );
    } finally {
      setRecognizing(false);
    }
  }

  async function submit(event) {
    event.preventDefault();

    setError('');
    clearScanMessage();

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    const currentStock = Number(
      form.currentStock || 0
    );

    const reorderLevel = Number(
      form.reorderLevel || 0
    );

    const costPrice = Number(
      form.costPrice || 0
    );

    const sellingPrice = Number(
      form.sellingPrice || 0
    );

    if (
      !Number.isFinite(currentStock) ||
      !Number.isFinite(reorderLevel) ||
      !Number.isFinite(costPrice) ||
      !Number.isFinite(sellingPrice)
    ) {
      setError(
        'Quantity, reorder level, cost price, and selling price must be valid numbers.'
      );

      return;
    }

    if (
      currentStock < 0 ||
      reorderLevel < 0 ||
      costPrice < 0 ||
      sellingPrice < 0
    ) {
      setError(
        'Quantity, reorder level, cost price, and selling price cannot be negative.'
      );

      return;
    }

    setBusy(true);

    try {
      const payload = {
        name: form.name.trim(),
        barcode:
          form.barcode.trim() || undefined,
        sku:
          form.sku.trim().toUpperCase() ||
          undefined,
        qrCode:
          form.qrCode.trim() ||
          form.barcode.trim() ||
          undefined,
        category:
          form.category || undefined,
        supplier:
          form.supplier || undefined,
        brand: form.brand.trim(),
        description: form.description.trim(),
        imageUrl:
          form.imageUrl?.trim() || undefined,
        unitType: form.unitType,
        branch: form.branch.trim(),
        currentStock,
        reorderLevel,
        costPrice,
        sellingPrice,
        expirationDate:
          form.expirationDate || undefined
      };

      if (initialProduct?._id) {
        await client.put(
          `/products/${initialProduct._id}`,
          payload
        );
      } else {
        await client.post(
          '/products',
          payload
        );
      }

      onSuccess?.();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to save product'
        )
      );
    } finally {
      setBusy(false);
    }
  }

  const inventoryValue =
    Number(form.currentStock || 0) *
    Number(form.costPrice || 0);

  const expectedRevenue =
    Number(form.currentStock || 0) *
    Number(form.sellingPrice || 0);

  const grossMargin =
    Number(form.sellingPrice || 0) -
    Number(form.costPrice || 0);

  return (
    <form
      className="product-form"
      onSubmit={submit}
    >
      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {scanMessage && (
        <div className="scan-success-message">
          <CheckCircle2 size={17} />

          <span>{scanMessage}</span>

          <button
            type="button"
            onClick={clearScanMessage}
            aria-label="Close scan message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {scanError && (
        <div className="form-error">
          {scanError}
        </div>
      )}

      {!initialProduct && (
        <div className="product-scan-box">
          <div className="product-scan-heading">
            <div className="product-scan-icon">
              <ScanLine size={20} />
            </div>

            <div>
              <h3>Scan product code</h3>

              <p>
                Scan a QR code or barcode to search
                your inventory and Open Food Facts.
              </p>
            </div>
          </div>

          {!scannerOpen ? (
            <button
              type="button"
              className="secondary-btn scan-product-btn"
              onClick={() => {
                setScannerOpen(true);
                clearScanMessage();
              }}
            >
              <ScanLine size={17} />
              Scan QR or Barcode
            </button>
          ) : (
            <div className="product-scanner-wrapper">
              <CameraScanner
                onDetected={lookupScannedCode}
              />

              {scanning && (
                <div className="scanner-status">
                  Searching your inventory and Open Food Facts...
                </div>
              )}

              <button
                type="button"
                className="secondary-btn close-scanner-btn"
                onClick={() =>
                  setScannerOpen(false)
                }
                disabled={scanning}
              >
                <X size={16} />
                Close Scanner
              </button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="product-scan-heading">
              <div className="product-scan-icon">
                <ScanLine size={20} />
              </div>

              <div>
                <h3>Picture product</h3>

                <p>
                  Take a clear photo of the front label.
                  The exact brand and product name will be extracted.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 8,
                flexWrap: 'wrap'
              }}
            >
              <label className="secondary-btn">
                Take photo

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={
                    recognizing || scanning
                  }
                  style={{ display: 'none' }}
                  onChange={event => {
                    const file =
                      event.target.files?.[0];

                    if (file) {
                      recognizeFromPhoto(file);
                    }

                    event.target.value = '';
                  }}
                />
              </label>

              <label className="secondary-btn">
                Choose from gallery

                <input
                  type="file"
                  accept="image/*"
                  disabled={
                    recognizing || scanning
                  }
                  style={{ display: 'none' }}
                  onChange={event => {
                    const file =
                      event.target.files?.[0];

                    if (file) {
                      recognizeFromPhoto(file);
                    }

                    event.target.value = '';
                  }}
                />
              </label>
            </div>

            {recognizing && (
              <div
                className="scanner-status"
                style={{ marginTop: 8 }}
              >
                Reading the product label...
              </div>
            )}

            {recognitionError && (
              <div
                className="form-error"
                style={{ marginTop: 8 }}
              >
                {recognitionError}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="form-section">
        <h3>Basic information</h3>

        <div className="form-grid">
          <label className="span-two">
            Product name

            <input
              required
              value={form.name}
              onChange={event =>
                change(
                  'name',
                  event.target.value
                )
              }
              placeholder="e.g. Alcoplus Ethyl Alcohol"
            />
          </label>

          <label>
            SKU

            <span className="field-hint">
              Optional — generated automatically if blank
            </span>

            <input
              value={form.sku}
              onChange={event =>
                change(
                  'sku',
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Leave blank to generate automatically"
            />
          </label>

          <label>
            Barcode

            <span className="field-hint">
              Leave blank to generate
            </span>

            <input
              value={form.barcode}
              onChange={event =>
                change(
                  'barcode',
                  event.target.value.toUpperCase()
                )
              }
              placeholder="ES-000001 or manufacturer code"
              disabled={Boolean(initialProduct)}
            />
          </label>

          <label>
            QR code

            <input
              value={form.qrCode}
              onChange={event =>
                change(
                  'qrCode',
                  event.target.value
                )
              }
              placeholder="Defaults to barcode"
            />
          </label>

          <label>
            Brand

            <input
              value={form.brand}
              onChange={event =>
                change(
                  'brand',
                  event.target.value
                )
              }
              placeholder="Brand name"
            />
          </label>

          <label className="span-two">
            Product image URL

            <input
              value={form.imageUrl || ''}
              onChange={event =>
                change(
                  'imageUrl',
                  event.target.value
                )
              }
              placeholder="Automatically filled when available"
            />
          </label>

          <label className="span-two">
            Description

            <textarea
              value={form.description}
              onChange={event =>
                change(
                  'description',
                  event.target.value
                )
              }
              rows="3"
              placeholder="Product description or ingredients"
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3>Inventory information</h3>

        <div className="form-grid">
          <label>
            Category

            <select
              value={form.category}
              onChange={event =>
                change(
                  'category',
                  event.target.value
                )
              }
            >
              <option value="">
                Select category
              </option>

              {categories.map(category => (
                <option
                  key={category._id}
                  value={category._id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Supplier

            <select
              value={form.supplier}
              onChange={event =>
                change(
                  'supplier',
                  event.target.value
                )
              }
            >
              <option value="">
                Select supplier
              </option>

              {suppliers.map(supplier => (
                <option
                  key={supplier._id}
                  value={supplier._id}
                >
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Unit type

            <select
              value={form.unitType}
              onChange={event =>
                change(
                  'unitType',
                  event.target.value
                )
              }
            >
              {[
                'piece',
                'case',
                'box',
                'pack',
                'kg',
                'liter',
                'sack'
              ].map(value => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Branch / warehouse

            <input
              value={form.branch}
              onChange={event =>
                change(
                  'branch',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Initial quantity

            <input
              type="number"
              min="0"
              step="1"
              value={form.currentStock}
              onChange={event =>
                change(
                  'currentStock',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Reorder level

            <input
              type="number"
              min="0"
              step="1"
              value={form.reorderLevel}
              onChange={event =>
                change(
                  'reorderLevel',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Expiration date

            <span className="field-hint">
              Optional
            </span>

            <input
              type="date"
              value={form.expirationDate}
              onChange={event =>
                change(
                  'expirationDate',
                  event.target.value
                )
              }
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3>Pricing and valuation</h3>

        <div className="form-grid">
          <label>
            Cost price

            <span className="field-hint">
              Internal purchase cost per unit
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={event =>
                change(
                  'costPrice',
                  event.target.value
                )
              }
              placeholder="0.00"
            />
          </label>

          <label>
            Selling price

            <span className="field-hint">
              Retail price used by the POS
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={event =>
                change(
                  'sellingPrice',
                  event.target.value
                )
              }
              placeholder="0.00"
            />
          </label>

          <div className="valuation-preview">
            <span>Calculated inventory value</span>

            <strong>
              ₱{money(inventoryValue)}
            </strong>

            <small>
              Current quantity × cost price
            </small>
          </div>

          <div className="valuation-preview">
            <span>Potential sales value</span>

            <strong>
              ₱{money(expectedRevenue)}
            </strong>

            <small>
              Current quantity × selling price
            </small>
          </div>

          <div className="valuation-preview">
            <span>Gross margin per unit</span>

            <strong
              className={
                grossMargin < 0
                  ? 'quantity-negative'
                  : 'quantity-positive'
              }
            >
              ₱{money(grossMargin)}
            </strong>

            <small>
              Selling price − cost price
            </small>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            window.history.back()
          }
          disabled={busy}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-btn"
          disabled={busy || scanning || recognizing}
        >
          {busy
            ? 'Saving...'
            : initialProduct
              ? 'Update Product'
              : 'Register Product'}
        </button>
      </div>
    </form>
  );
}