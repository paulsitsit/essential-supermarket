import axios from 'axios';

import {
  clearOfflineCache,
  getCacheScope
} from '../services/offlineCache';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

client.interceptors.request.use(
  (config) => {
    const method = String(config.method || 'get').toLowerCase();

    if (
      !navigator.onLine &&
      ['post', 'put', 'patch', 'delete'].includes(method)
    ) {
      return Promise.reject(
        new Error(
          'You are offline. This action requires an internet connection.'
        )
      );
    }

    const token = localStorage.getItem('essential_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Allow the browser/Axios to create:
    // multipart/form-data; boundary=...
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    } else if (config.data && typeof config.data === 'object') {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (
      status === 401 &&
      !isLoginRequest &&
      window.location.pathname !== '/login'
    ) {
      const scope = getCacheScope();
      void clearOfflineCache(scope);

      localStorage.removeItem('essential_token');
      localStorage.removeItem('essential_account');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default client;