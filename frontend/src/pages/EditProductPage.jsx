import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import ProductForm from '../components/inventory/ProductForm';
import { getErrorMessage } from '../utils/errors';

export default function EditProductPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [product, setProduct] = useState(null); const [categories, setCategories] = useState([]); const [suppliers, setSuppliers] = useState([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([client.get(`/products/${id}`), client.get('/categories'), client.get('/suppliers')]).then(([p, c, s]) => { setProduct(p.data); setCategories(c.data); setSuppliers(s.data); }).catch(err => setError(getErrorMessage(err))); }, [id]);
  if (error) return <div className="form-error">{error}</div>;
  if (!product) return <div className="page-loading">Loading product...</div>;
  return <div><div className="page-heading"><div><Link className="back-link" to="/products"><ArrowLeft size={16} /> Back to products</Link><p className="eyebrow">ADMIN ONLY</p><h1>Edit Product</h1><p>Update product information without changing its stock history.</p></div></div><GlassCard className="form-card"><ProductForm initialProduct={product} categories={categories} suppliers={suppliers} onSuccess={() => navigate('/products')} /></GlassCard></div>;
}