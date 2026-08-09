import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import ProductForm from '../components/inventory/ProductForm';
import { getErrorMessage } from '../utils/errors';

export default function AddProductPage() {
  const [categories, setCategories] = useState([]); const [suppliers, setSuppliers] = useState([]); const [error, setError] = useState(''); const navigate = useNavigate();
  useEffect(() => { Promise.all([client.get('/categories'), client.get('/suppliers')]).then(([a, b]) => { setCategories(a.data); setSuppliers(b.data); }).catch(err => setError(getErrorMessage(err))); }, []);
  return <div><div className="page-heading"><div><Link className="back-link" to="/products"><ArrowLeft size={16} /> Back to products</Link><p className="eyebrow">ADMIN ONLY</p><h1>Register New Product</h1><p>Create a product before receiving its stock.</p></div></div>{error && <div className="form-error page-message">{error}</div>}<GlassCard className="form-card"><ProductForm categories={categories} suppliers={suppliers} onSuccess={() => navigate('/products')} /></GlassCard></div>;
}