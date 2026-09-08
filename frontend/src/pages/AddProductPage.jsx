import {
  useEffect,
  useState
} from 'react';

import {
  ArrowLeft
} from 'lucide-react';

import {
  Link,
  useNavigate
} from 'react-router-dom';

import client from '../api/client';

import GlassCard from '../components/common/GlassCard';
import ProductForm from '../components/inventory/ProductForm';

import {
  getErrorMessage
} from '../utils/errors';

export default function AddProductPage() {
  const [
    categories,
    setCategories
  ] = useState([]);

  const [
    suppliers,
    setSuppliers
  ] = useState([]);

  const [
    error,
    setError
  ] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadFormOptions() {
      try {
        const [
          categoriesResponse,
          suppliersResponse
        ] = await Promise.all([
          client.get('/categories'),
          client.get('/suppliers')
        ]);

        setCategories(
          categoriesResponse.data
        );

        setSuppliers(
          suppliersResponse.data
        );
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            'Unable to load product form options.'
          )
        );
      }
    }

    loadFormOptions();
  }, []);

  function handleProductCreated(product) {
    /*
     * The product has stock 0 by design.
     *
     * Send the manager to the product list, where they can use
     * the existing Receive Stock action to create a first batch.
     *
     * The query parameter is optional, but it can be used later
     * to highlight/open a Receive Stock modal automatically.
     */
    if (product?._id) {
      navigate(
        `/products?newProduct=${encodeURIComponent(
          product._id
        )}`
      );

      return;
    }

    navigate('/products');
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <Link
            className="back-link"
            to="/products"
          >
            <ArrowLeft size={16} />
            Back to products
          </Link>

          <p className="eyebrow">
            ADMIN ONLY
          </p>

          <h1>Register New Product</h1>

          <p>
            Register catalog details first. Add
            sellable inventory afterward through
            Receive Stock, which creates the first
            product batch.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error page-message">
          {error}
        </div>
      )}

      <GlassCard className="form-card">
        <ProductForm
          categories={categories}
          suppliers={suppliers}
          onSuccess={handleProductCreated}
        />
      </GlassCard>
    </div>
  );
}