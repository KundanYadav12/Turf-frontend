import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  venues: [],
  selectedSport: '',
  selectedCity: 'Mumbai',
  searchQuery: '',
  currentVenue: null,
  loading: false,
  error: null
};

const venueSlice = createSlice({
  name: 'venue',
  initialState,
  reducers: {
    setVenues: (state, action) => {
      state.venues = action.payload;
    },
    setSelectedSport: (state, action) => {
      state.selectedSport = action.payload;
    },
    setSelectedCity: (state, action) => {
      state.selectedCity = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setCurrentVenue: (state, action) => {
      state.currentVenue = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

export const {
  setVenues,
  setSelectedSport,
  setSelectedCity,
  setSearchQuery,
  setCurrentVenue,
  setLoading
} = venueSlice.actions;

export default venueSlice.reducer;
