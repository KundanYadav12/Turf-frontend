import axios from 'axios';
import { isTokenExpired, logout } from '../features/auth/authSlice';
import { store } from '../store';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';
  return `${backend}/api`;
};

// In-flight request deduplication map
const inFlightRequests = new Map();

// In-memory cache for fast instant navigation (stale-while-revalidate pattern)
const memoryCache = new Map();
const DEFAULT_CACHE_TTL_MS = 20000; // 20 seconds cache for instant screen transitions

export const clearApiCache = (pattern) => {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
};

const API = axios.create({
  baseURL: getBaseURL()
});

API.interceptors.request.use((config) => {
  // Update baseURL dynamically if needed based on runtime environment
  config.baseURL = getBaseURL();

  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('turf_token') || localStorage.getItem('token');
      if (token && token !== 'null' && token !== 'undefined') {
        if (isTokenExpired(token)) {
          localStorage.removeItem('turf_token');
          localStorage.removeItem('turf_user');
          localStorage.removeItem('token');
          if (store && store.dispatch) store.dispatch(logout());
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // Ignore in safe environments
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

API.interceptors.response.use(
  (response) => {
    // Invalidate matching caches on mutations
    const method = response.config?.method?.toLowerCase();
    if (['post', 'put', 'delete', 'patch'].includes(method)) {
      const url = response.config?.url || '';
      const cleanPath = url.split('?')[0].replace(/^\/api/, '');
      if (cleanPath) {
        clearApiCache(cleanPath);
      }
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('turf_token');
        localStorage.removeItem('turf_user');
        localStorage.removeItem('token');
        if (store && store.dispatch) store.dispatch(logout());
      } catch (e) {}
    }
    return Promise.reject(error);
  }
);

// Wrapped get method with in-flight deduplication and instant in-memory cache
const originalGet = API.get.bind(API);
API.get = function (url, config = {}) {
  const method = 'get';
  const fullKey = `${url}?${JSON.stringify(config.params || {})}`;
  const useCache = config.cache !== false;
  const ttl = typeof config.cacheTtl === 'number' ? config.cacheTtl : DEFAULT_CACHE_TTL_MS;

  // 1. Instant Cache Hit
  if (useCache && memoryCache.has(fullKey)) {
    const cached = memoryCache.get(fullKey);
    if (Date.now() - cached.timestamp < ttl) {
      // Return clone of cached response immediately
      return Promise.resolve({ ...cached.response, fromCache: true });
    } else {
      memoryCache.delete(fullKey);
    }
  }

  // 2. In-flight Request Deduplication
  if (inFlightRequests.has(fullKey)) {
    return inFlightRequests.get(fullKey);
  }

  const promise = originalGet(url, config)
    .then((res) => {
      if (useCache && res.status >= 200 && res.status < 300) {
        memoryCache.set(fullKey, {
          response: res,
          timestamp: Date.now()
        });
      }
      return res;
    })
    .finally(() => {
      inFlightRequests.delete(fullKey);
    });

  inFlightRequests.set(fullKey, promise);
  return promise;
};

export default API;
