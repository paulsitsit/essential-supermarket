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
import GhostFibers from './GhostFibers';

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { login, logout } = useAuth();

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
       * account system, but cashiers use the separate
       * Point of Sale application.
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
    <main className="login-page">
      <div className="login-background">
        <GhostFibers
          lineColor="#22C55E"
          glowColor="#FFFFFF"
          speed={0.2}
          scale={2}
          rotation={0}
          rotationSpeed={0.25}
          layers={4}
          waveAmplitude={0.015}
          waveFrequency={3}
          waveSpeed={0.15}
          layerSpeed={0.08}
          twist={0.1}
          twistFrequency={5}
          twistSpeed={1.2}
          lineFrequency={5}
          lineSpacing={2}
          lineSharpness={16}
          glowFalloff={10}
          glowIntensity={1.6}
          brightness={2}
          blueBoost={1.25}
          vignette={0.8}
          grain={0.05}
          dpr={1}
          lightMode={false}
          fps={60}
          paused={false}
        />
      </div>

      <div
        className="login-decoration decoration-one"
        aria-hidden="true"
      />

      <div
        className="login-decoration decoration-two"
        aria-hidden="true"
      />

      <section className="login-card glass-card">
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
          <div
            className="form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <label htmlFor="login-email">
            Email address

            <div className="input-wrap">
              <Mail
                size={18}
                aria-hidden="true"
              />

              <input
                id="login-email"
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

          <label htmlFor="login-password">
            Password

            <div className="input-wrap">
              <LockKeyhole
                size={18}
                aria-hidden="true"
              />

              <input
                id="login-password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                minLength={8}
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

            <Leaf
              size={18}
              aria-hidden="true"
            />
          </button>
        </form>

        <small className="login-footer">
          Authorized inventory accounts only.
          Cashiers sign in through the Point of Sale system.
        </small>
      </section>
    </main>
  );
}