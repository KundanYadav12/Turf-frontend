import { createSlice } from '@reduxjs/toolkit';

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: 'dark', // Default matching SSR
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('turf_theme', state.mode);
          document.documentElement.setAttribute('data-theme', state.mode);
        } catch (e) {}
      }
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('turf_theme', state.mode);
          document.documentElement.setAttribute('data-theme', state.mode);
        } catch (e) {}
      }
    },
    rehydrateTheme: (state) => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('turf_theme') || 'dark';
          state.mode = saved;
          document.documentElement.setAttribute('data-theme', saved);
        } catch (e) {}
      }
    }
  }
});

export const { toggleTheme, setTheme, rehydrateTheme } = themeSlice.actions;
export default themeSlice.reducer;
