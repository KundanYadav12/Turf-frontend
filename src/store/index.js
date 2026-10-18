import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import venueReducer from '../features/venue/venueSlice';
import bookingReducer from '../features/booking/bookingSlice';
import themeReducer from '../features/theme/themeSlice';
import tournamentReducer from '../features/tournament/tournamentSlice';
import teamReducer from '../features/team/teamSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    venue: venueReducer,
    booking: bookingReducer,
    theme: themeReducer,
    tournament: tournamentReducer,
    team: teamReducer
  }
});
