import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedCourt: null,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedSlot: null,
  appliedCoupon: null,
  myBookings: [],
  loading: false
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedCourt: (state, action) => {
      state.selectedCourt = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
      state.selectedSlot = null; // reset slot selection on date change
    },
    setSelectedSlot: (state, action) => {
      state.selectedSlot = action.payload;
    },
    setAppliedCoupon: (state, action) => {
      state.appliedCoupon = action.payload;
    },
    setMyBookings: (state, action) => {
      state.myBookings = action.payload;
    },
    clearBookingSelection: (state) => {
      state.selectedSlot = null;
      state.appliedCoupon = null;
    }
  }
});

export const {
  setSelectedCourt,
  setSelectedDate,
  setSelectedSlot,
  setAppliedCoupon,
  setMyBookings,
  clearBookingSelection
} = bookingSlice.actions;

export default bookingSlice.reducer;
