import { useState } from 'react';
import { Eye, EyeOff, Leaf, LockKeyhole, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await login(form.email, form.password); navigate(location.state?.from?.pathname || '/dashboard', { replace: true }); }
    catch (err) { setError(err.response?.data?.message || 'Unable to sign in. Check your credentials.'); }
    finally { setBusy(false); }
  }

  return <div className="login-page"><div className="login-decoration decoration-one" /><div className="login-decoration decoration-two" /><div className="login-card glass-card"><div className="login-logo"><div className="brand-mark large">ES</div><div><h1>Essential<span>Supermarket</span></h1><p>Inventory management system</p></div></div><div className="login-heading"><h2>Welcome back</h2><p>Sign in to monitor your inventory.</p></div>{error && <div className="form-error">{error}</div>}<form onSubmit={submit}><label>Email address<div className="input-wrap"><Mail size={18} /><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@supermarket.com" /></div></label><label>Password<div className="input-wrap"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" /><button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><button className="primary-btn full-width" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <Leaf size={18} /></button></form><small className="login-footer">Authorized inventory accounts only</small></div></div>;
}