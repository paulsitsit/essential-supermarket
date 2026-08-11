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
  expirationDate: '',
  imageUrl: ''
};

function formatDateInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function getInitialForm(initialProduct) {
  if (!initialProduct) {
    return {
      ...emptyForm
    };
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

    expirationDate: formatDateInput(
      initialProduct.expirationDate
    )
  };
}

function getProductId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return value._id || '';
  }

  return value;
}

function applyLocalProduct(product, currentForm, code) {
  return {
    ...currentForm,

    name:
      product.name ||
      currentForm.name,

    barcode:
      product.barcode ||
      code,

    sku:
      product.sku ||
      currentForm.sku,

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

    brand:
      product.brand ||
      currentForm.brand,

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

    expirationDate:
      formatDateInput(
        product.expirationDate
      ) ||
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
      product.name ||
      currentForm.name,

    barcode:
      product.barcode ||
      code,

    qrCode:
      product.qrCode ||
      product.barcode ||
      code,

    brand:
      product.brand ||
      currentForm.brand,

    description:
      product.description ||
      currentForm.description,

    imageUrl:
      product.imageUrl ||
      currentForm.imageUrl ||
      '',

    sku: currentForm.sku,
    category: currentForm.category,
    supplier: currentForm.supplier,
    currentStock: currentForm.currentStock,
    reorderLevel: currentForm.reorderLevel,
    costPrice: currentForm.costPrice,
    expirationDate: currentForm.expirationDate
  };
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
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  const [recognizing, setRecognizing] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');

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

  async function lookupScannedCode(code) {
    const cleanCode = String(code || '').trim();

    if (!cleanCode || scanning) {
      return;
    }

    setScanning(true);
    setScanError('');
    setScanMessage('');

    try {
      let product;
      let source = 'local';

      try {
        const localResponse = await client.get(
          `/products/scan/${encodeURIComponent(cleanCode)}`
        );

        product =
          localResponse.data?.product ||
          localResponse.data;
      } catch (localError) {
        if (localError.response?.status !== 404) {
          throw localError;
        }

        const externalResponse = await client.get(
          `/products/lookup/${encodeURIComponent(cleanCode)}`
        );

        product =
          externalResponse.data?.product ||
          externalResponse.data;

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
          ? 'Product information was found online. Review the fields before saving.'
          : 'Registered product found. The form was filled automatically.'
      );

      setScannerOpen(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setForm(current => ({
          ...current,
          barcode: cleanCode,
          qrCode:
            current.qrCode ||
            cleanCode
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

      const res = await client.post('/products/recognize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { product, detectedBarcode, labels, source } = res.data;

      if (source === 'db' || source === 'openfoodfacts') {
        setForm(current =>
          source === 'openfoodfacts'
            ? applyExternalProduct(product, current, detectedBarcode || current.barcode)
            : applyLocalProduct(product, current, detectedBarcode || current.barcode)
        );

        setScanMessage(
          source === 'openfoodfacts'
            ? 'Product information was found online from the photo. Review the fields before saving.'
            : 'Registered product found from the photo. The form was filled automatically.'
        );
      } else {
        const suggestedName = labels.slice(0, 3).join(', ');
        setForm(current => ({
          ...current,
          name: suggestedName || current.name,
          barcode: detectedBarcode || current.barcode
        }));

        setScanMessage(
          'No exact product found. AI suggestions were added to the form. Please review and correct before saving.'
        );
      }
    } catch (err) {
      setRecognitionError(
        getErrorMessage(err, 'Failed to recognize product from photo')
      );
    } finally {
      setRecognizing(false);
    }
  }

  function handleScannerDetected(code) {
    lookupScannedCode(code);
  }

  function clearScanMessage() {
    setScanMessage('');
    setScanError('');
  }

  async function submit(event) {
    event.preventDefault();

    setError('');
    clearScanMessage();

    if (!form.name.trim()) {
      setError(
        'Product name is required.'
      );
      return;
    }

    if (
      Number(form.currentStock) < 0 ||
      Number(form.reorderLevel) < 0 ||
      Number(form.costPrice) < 0
    ) {
      setError(
        'Quantity, reorder level, and cost price cannot be negative.'
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        name:
          form.name.trim(),

        barcode:
          form.barcode.trim() ||
          undefined,

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

        brand:
          form.brand.trim(),

        description:
          form.description.trim(),

        imageUrl:
          form.imageUrl?.trim() ||
          undefined,

        unitType:
          form.unitType,

        branch:
          form.branch.trim(),

        currentStock:
          Number(form.currentStock || 0),

        reorderLevel:
          Number(form.reorderLevel || 0),

        costPrice:
          Number(form.costPrice || 0),

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
                Scan a QR code or barcode to search your inventory and Open Food Facts.
              </p>
            </div>
          </div>

          {!scannerOpen ? (
            <button
              type="button"
              className="secondary-btn scan-product-btn"
              onClick={() => {
                setScannerOpen(true);
                setScanError('');
                setScanMessage('');
              }}
            >
              <ScanLine size={17} />
              Scan QR or Barcode
            </button>
          ) : (
            <div className="product-scanner-wrapper">
              <CameraScanner
                onDetected={handleScannerDetected}
              />

              {scanning && (
                <div className="scanner-status">
                  Searching your inventory and Open Food Facts...
                </div>
              )}

              <button
                type="button"
                className="secondary-btn close-scanner-btn"
                onClick={() => setScannerOpen(false)}
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
                <h3>Picture product (optional)</h3>
                <p>
                  Take a photo of the item. We’ll try to read the barcode and suggest product details.
                </p>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) recognizeFromPhoto(file);
              }}
              disabled={recognizing || scanning}
              style={{ marginTop: 8 }}
            />

            {recognizing && (
              <div className="scanner-status" style={{ marginTop: 8 }}>
                Analyzing photo…
              </div>
            )}

            {recognitionError && (
              <div className="form-error" style={{ marginTop: 8 }}>
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
              placeholder="e.g. Bottled Water 500ml"
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
              <option value="piece">piece</option>
              <option value="case">case</option>
              <option value="box">box</option>
              <option value="pack">pack</option>
              <option value="kg">kg</option>
              <option value="liter">liter</option>
              <option value="sack">sack</option>
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
        <h3>Inventory valuation</h3>

        <div className="form-grid">
          <label>
            Cost price

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
            />
          </label>

          <div className="valuation-preview">
            <span>
              Calculated inventory value
            </span>

            <strong>
              ₱
              {(
                Number(form.currentStock || 0) *
                Number(form.costPrice || 0)
              ).toLocaleString('en-PH', {
                minimumFractionDigits: 2
              })}
            </strong>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => window.history.back()}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-btn"
          disabled={busy || scanning}
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