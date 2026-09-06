import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail
} from 'lucide-react';
import {
  useLocation,
  useNavigate
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const {
    login,
    logout
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  function updateField(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setError('');
    setBusy(true);

    try {
      const account = await login(
        form.email,
        form.password
      );

      /*
       * Cashier credentials are managed by the shared
       * account system, but Cashiers use the separate
       * Point of Sale application—not this inventory app.
       */
      if (account?.role === 'cashier') {
        logout({ redirect: false });

        setError(
          'Cashier accounts can only sign in through the Point of Sale system.'
        );

        return;
      }

      const requestedPath =
        location.state?.from?.pathname;

      const fallbackPath =
        account?.role === 'staff'
          ? '/scanner'
          : '/dashboard';

      navigate(
        requestedPath || fallbackPath,
        {
          replace: true
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to sign in. Check your credentials.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-decoration decoration-one" />
      <div className="login-decoration decoration-two" />

      <div className="login-card glass-card">
        <div className="login-logo">
          <div className="brand-mark large">
            <img
              src={Logo}
              alt="Essential Supermarket"
              className="brand-logo-img"
            />
          </div>

          <div>
            <h1>
              Essential
              <span>Supermarket</span>
            </h1>

            <p>Inventory management system</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>

          <p>
            Sign in to manage inventory and supermarket operations.
          </p>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <label>
            Email address

            <div className="input-wrap">
              <Mail size={18} />

              <input
                type="email"
                required
                autoComplete="username"
                value={form.email}
                onChange={event =>
                  updateField(
                    'email',
                    event.target.value
                  )
                }
                placeholder="name@supermarket.com"
              />
            </div>
          </label>

          <label>
            Password

            <div className="input-wrap">
              <LockKeyhole size={18} />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                minLength="8"
                autoComplete="current-password"
                value={form.password}
                onChange={event =>
                  updateField(
                    'password',
                    event.target.value
                  )
                }
                placeholder="Enter your password"
              />

              <button
                type="button"
                className="input-action"
                onClick={() =>
                  setShowPassword(
                    previous => !previous
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="primary-btn full-width"
            disabled={busy}
          >
            {busy
              ? 'Signing in...'
              : 'Sign in'}

            <Leaf size={18} />
          </button>
        </form>

        <small className="login-footer">
          Authorized inventory accounts only. Cashiers sign in through the Point of Sale system.
        </small>
      </div>
    </div>
  );
}