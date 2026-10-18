'use client';
import React, { useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from '../../store';
import { rehydrateAuth } from '../../features/auth/authSlice';
import { rehydrateTheme } from '../../features/theme/themeSlice';

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
