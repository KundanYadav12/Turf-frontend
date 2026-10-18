import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  myTeams: [],
  discoverTeams: [],
  loading: false,
  error: null
};

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setTeamLoading: (state, action) => {
      state.loading = action.payload;
    },
    setMyTeams: (state, action) => {
      state.myTeams = action.payload;
      state.loading = false;
      state.error = null;
    },
    setDiscoverTeams: (state, action) => {
      state.discoverTeams = action.payload;
      state.loading = false;
      state.error = null;
    },
    addCreatedTeam: (state, action) => {
      state.myTeams.unshift(action.payload);
    },
    removeTeam: (state, action) => {
      const teamId = action.payload;
      state.myTeams = state.myTeams.filter((t) => t.id !== teamId);
    },
    // Mandatory cleanup on logout to prevent multi-tenant cross-contamination
    clearTeamState: (state) => {
      state.myTeams = [];
      state.discoverTeams = [];
      state.loading = false;
      state.error = null;
    }
  }
});

export const {
  setTeamLoading,
  setMyTeams,
  setDiscoverTeams,
  addCreatedTeam,
  removeTeam,
  clearTeamState
} = teamSlice.actions;

export default teamSlice.reducer;
