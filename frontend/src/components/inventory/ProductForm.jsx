import { useEffect, useState } from 'react';

import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';

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
  expirationDate: ''
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
  const [busy, setBusy] = useState(false);

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

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.sku.trim()) {
      setError(
        'Product name and SKU are required.'
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
        name: form.name.trim(),
        barcode: form.barcode.trim() || undefined,
        sku: form.sku.trim().toUpperCase(),
        qrCode:
          form.qrCode.trim() ||
          form.barcode.trim() ||
          undefined,
        category: form.category || undefined,
        supplier: form.supplier || undefined,
        brand: form.brand.trim(),
        description: form.description.trim(),
        unitType: form.unitType,
        branch: form.branch.trim(),
        currentStock: Number(form.currentStock || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        costPrice: Number(form.costPrice || 0),
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

            <input
              required
              value={form.sku}
              onChange={event =>
                change(
                  'sku',
                  event.target.value.toUpperCase()
                )
              }
              placeholder="BW-500"
            />
          </label>

          <label>
            Barcode{' '}
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
              placeholder="Product description"
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
            Expiration date{' '}
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
          disabled={busy}
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