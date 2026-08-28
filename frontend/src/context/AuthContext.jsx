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
    Boolean(localStorage.getItem('essential_token'))
  );

  useEffect(() => {
    async function verify() {
      if (!localStorage.getItem('essential_token')) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await client.get('/auth/me');

        setAccount(data.account);

        localStorage.setItem(
          'essential_account',
          JSON.stringify(data.account)
        );
      } catch {
        localStorage.removeItem('essential_token');
        localStorage.removeItem('essential_account');
        setAccount(null);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, []);

  async function login(email, password) {
    const { data } = await client.post(
      '/auth/login',
      { email, password }
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
     * On Android: request notification permission and register
     * the device with Firebase Cloud Messaging.
     *
     * In a normal web browser, the notification service skips
     * this safely and does not affect website login.
     */
    initializePushNotifications();

    return data.account;
  }

  function logout() {
    localStorage.removeItem('essential_token');
    localStorage.removeItem('essential_account');

    setAccount(null);

    window.location.href = '/login';
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