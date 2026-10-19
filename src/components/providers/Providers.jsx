'use client';
import React, { useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { store } from '../../store';
import { rehydrateAuth, logout, isTokenExpired } from '../../features/auth/authSlice';
import { rehydrateTheme } from '../../features/theme/themeSlice';

// Global Axios Interceptors: Ensure Bearer token is attached and handle 401 session expirations
if (typeof window !== 'undefined') {
  axios.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('turf_token') || localStorage.getItem('token');
      if (token && token !== 'null' && token !== 'undefined') {
        if (isTokenExpired(token)) {
          // Token is expired: purge it immediately and reset Redux state
          localStorage.removeItem('turf_token');
          localStorage.removeItem('turf_user');
          localStorage.removeItem('token');
          store.dispatch(logout());
        } else if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // Safe fallback in restricted storage contexts
    }
    return config;
  }, (error) => Promise.reject(error));

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        try {
          localStorage.removeItem('turf_token');
          localStorage.removeItem('turf_user');
          localStorage.removeItem('token');
          store.dispatch(logout());
        } catch (e) {}
      }
      return Promise.reject(error);
    }
  );
}

function ThemeAndAuthSync({ children }) {
  const dispatch = useDispatch();
  const themeMode = useSelector((state) => state.theme?.mode) || 'dark';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    dispatch(rehydrateAuth());
    dispatch(rehydrateTheme());
    setMounted(true);
  }, [dispatch]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  return <>{children}</>;
}

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <ThemeAndAuthSync>
        {children}
      </ThemeAndAuthSync>
    </Provider>
  );
}
