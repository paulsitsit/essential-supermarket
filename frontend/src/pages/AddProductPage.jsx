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

import {
  cachedGet
} from '../services/offlineCache';

import GlassCard from '../components/common/GlassCard';
import ProductForm from '../components/inventory/ProductForm';

import {
  getErrorMessage
} from '../utils/errors';

export default function AddProductPage() {
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadFormOptions() {
      try {
        const [
          categoriesResponse,
          suppliersResponse
        ] = await Promise.all([
          cachedGet('/categories'),
          cachedGet('/suppliers')
        ]);

        if (!active) {
          return;
        }

        setCategories(
          categoriesResponse.data
        );

        setSuppliers(
          suppliersResponse.data
        );
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              'Unable to load product form options.'
            )
          );
        }
      }
    }

    loadFormOptions();

    return () => {
      active = false;
    };
  }, []);

  function handleProductCreated(product) {
    if (product?._localDraft) {
      navigate('/pending-products');
      return;
    }

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

          <h1>
            Register New Product
          </h1>

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