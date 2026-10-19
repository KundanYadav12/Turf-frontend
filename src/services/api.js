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
  (response) => response,
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

export default API;
