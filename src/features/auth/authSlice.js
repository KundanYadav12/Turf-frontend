import { createSlice } from '@reduxjs/toolkit';

const initialState = { token: null, user: null, isAuthenticated: false };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('turf_token', token);
        localStorage.setItem('turf_user', JSON.stringify(user));
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
      }
    },
    // Hydrate state once client is ready
    rehydrateAuth: (state) => {
      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('turf_token');
          const user = localStorage.getItem('turf_user') ? JSON.parse(localStorage.getItem('turf_user')) : null;
          state.token = token || null;
          state.user = user || null;
          state.isAuthenticated = !!token;
        } catch (e) {}
      }
    }
  }
});

export const { setCredentials, updateUser, logout, rehydrateAuth } = authSlice.actions;
export default authSlice.reducer;
