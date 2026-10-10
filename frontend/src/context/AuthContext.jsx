import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import client from '../api/client';

import {
  initializePushNotifications
} from '../services/pushNotifications';

import {
  clearOfflineCache,
  getCacheScope
} from '../services/offlineCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem('essential_account')
        ) || null
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(
    Boolean(
      localStorage.getItem('essential_token')
    )
  );

  useEffect(() => {
    async function verify() {
      const token = localStorage.getItem(
        'essential_token'
      );

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await client.get('/auth/me', {
          timeout: 10000
        });

        setAccount(data.account);

        localStorage.setItem(
          'essential_account',
          JSON.stringify(data.account)
        );
      } catch (error) {
        const transportFailure =
          !error.response &&
          (
            error.code === 'ERR_NETWORK' ||
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT'
          );

        if (transportFailure) {
          // Keep the already stored account during a network outage.
          // No new offline login is performed.
          console.warn(
            'Session verification unavailable; using saved session.'
          );
        } else {
          const scope = getCacheScope();

          localStorage.removeItem('essential_token');
          localStorage.removeItem('essential_account');

          setAccount(null);

          void clearOfflineCache(scope);
        }
      } finally {
        setLoading(false);
      }
    }

    verify();

    window.addEventListener('online', verify);

    return () => {
      window.removeEventListener('online', verify);
    };
  }, []);

  async function login(email, password) {
    const { data } = await client.post(
      '/auth/login',
      {
        email,
        password
      }
    );

    localStorage.setItem(
      'essential_token',
      data.token
    );

    localStorage.setItem(
      'essential_account',
      JSON.stringify(data.account)
    );

    setAccount(data.account);

    /*
     * This remains safe for normal inventory users.
     * A Cashier is removed immediately by LoginPage
     * because Cashiers must use the separate POS site.
     */
    initializePushNotifications();

    return data.account;
  }

  function logout({ redirect = true } = {}) {
    const scope = getCacheScope();
    void clearOfflineCache(scope);

    localStorage.removeItem('essential_token');

    localStorage.removeItem(
      'essential_account'
    );

    setAccount(null);

    if (redirect) {
      window.location.href = '/login';
    }
  }

  const value = useMemo(
    () => ({
      account,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(account)
    }),
    [account, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}