import axios from 'axios';
import { healthService } from './healthService';

const getStoredToken = () => {
  try {
    return window.localStorage.getItem('crm_token');
  } catch {
    return null;
  }
};

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5035/api';
  }

  return `${protocol}//${hostname}:5035/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    try {
      healthService.setOnline();
    } catch (e) { }
    return response;
  },
  (error) => {
    const resp = error && error.response;

    if (resp && resp.status === 401) {
      try {
        const href = window && window.location && window.location.href ? window.location.href : '';
        const pathname = window && window.location && window.location.pathname ? window.location.pathname : '';
        const isOnLogin =
          pathname === '/login' ||
          pathname.startsWith('/login') ||
          href.includes('/login');
        const isOnSetup =
          pathname === '/setup' ||
          pathname.startsWith('/setup') ||
          href.includes('/setup');

        if (!isOnLogin && !isOnSetup) {
          window.location.href = healthService.isSetupRequired() ? '/setup' : '/login';
        }
      } catch (e) { }
    }

    const msg = (error && (error.message || '')).toString();
    const code = error && error.code;

    if (
      msg.includes('ERR_CONNECTION_REFUSED') ||
      msg.includes('Network Error') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      code === 'ECONNREFUSED' ||
      code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED'
    ) {
      try {
        healthService.setOffline();
      } catch (e) { }
    }

    return Promise.reject(error);
  }
);

export default api;