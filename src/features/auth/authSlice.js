import { createSlice } from '@reduxjs/toolkit';

/**
 * Safely decodes JWT payload and determines if token is expired
 */
export const isTokenExpired = (token) => {
  if (!token || typeof token !== 'string' || token === 'null' || token === 'undefined') {
    return true;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed || !parsed.exp) return false;
    // Buffer by 5 seconds
    return parsed.exp * 1000 < Date.now() + 5000;
  } catch (err) {
    return true;
  }
};

const initialState = { token: null, user: null, isAuthenticated: false };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload || {};
      if (token && !isTokenExpired(token)) {
        state.token = token;
        state.user = user || null;
        state.isAuthenticated = true;
        if (typeof window !== 'undefined') {
          localStorage.setItem('turf_token', token);
          if (user) {
            localStorage.setItem('turf_user', JSON.stringify(user));
          }
        }
      } else {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('turf_token');
          localStorage.removeItem('turf_user');
          localStorage.removeItem('token');
        }
      }
    },

    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem('turf_user', JSON.stringify(state.user));
        }
      }
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('turf_token');
        localStorage.removeItem('turf_user');
        localStorage.removeItem('token');
      }
    },

    // Hydrate state once client is ready, purging any expired or malformed tokens
    rehydrateAuth: (state) => {
      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('turf_token') || localStorage.getItem('token');
          if (token && !isTokenExpired(token)) {
            let user = null;
            const userStr = localStorage.getItem('turf_user');
            if (userStr && userStr !== 'null' && userStr !== 'undefined') {
              try {
                user = JSON.parse(userStr);
              } catch (e) {}
            }
            state.token = token;
            state.user = user;
            state.isAuthenticated = true;
          } else {
            // Token is absent or expired: purge stale credentials
            localStorage.removeItem('turf_token');
            localStorage.removeItem('turf_user');
            localStorage.removeItem('token');
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
          }
        } catch (e) {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      }
    }
  }
});

export const { setCredentials, updateUser, logout, rehydrateAuth } = authSlice.actions;
export default authSlice.reducer;
