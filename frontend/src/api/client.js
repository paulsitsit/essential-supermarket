import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('essential_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (
      status === 401 &&
      !isLoginRequest &&
      window.location.pathname !== '/login'
    ) {
      localStorage.removeItem('essential_token');
      localStorage.removeItem('essential_account');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default client;