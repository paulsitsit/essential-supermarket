import {
  useEffect,
  useState
} from 'react';

import {
  ArrowLeft
} from 'lucide-react';

import {
  Link,
  useNavigate,
  useParams
} from 'react-router-dom';

import {
  cachedGet
} from '../services/offlineCache';

import GlassCard from '../components/common/GlassCard';
import ProductForm from '../components/inventory/ProductForm';

import {
  getErrorMessage
} from '../utils/errors';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');
  const [cachedAt, setCachedAt] = useState(null);

  useEffect(() => {
    let active = true;

    setProduct(null);
    setError('');
    setCachedAt(null);

    async function load() {
      try {
        const [p, c, s] = await Promise.all([
          cachedGet(`/products/${id}`),
          cachedGet('/categories'),
          cachedGet('/suppliers')
        ]);

        if (!active) {
          return;
        }

        setProduct(p.data);
        setCategories(c.data);
        setSuppliers(s.data);

        setCachedAt(
          p.cached ? p.savedAt : null
        );
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              'Unable to load product.'
            )
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="form-error">
        {error}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-loading">
        Loading product...
      </div>
    );
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
            Edit Product
          </h1>

          <p>
            Update product information without
            changing its stock history.
          </p>
        </div>
      </div>

      {cachedAt && (
        <div
          className="inventory-cache-notice"
          role="status"
        >
          This form was loaded from saved product data
          dated{' '}
          {new Date(cachedAt).toLocaleString()}.
          Offline saves remain local drafts.
        </div>
      )}

      <GlassCard className="form-card">
        <ProductForm
          initialProduct={product}
          categories={categories}
          suppliers={suppliers}
          onSuccess={savedProduct => {
            navigate(
              savedProduct?._localDraft
                ? '/pending-products'
                : '/products'
            );
          }}
        />
      </GlassCard>
    </div>
  );
}