import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Normalized Tournaments Directory
  tournamentsById: {},
  allTournamentIds: [],
  feedPagination: {
    hasMore: true,
    nextCursor: null
  },
  loading: false,
  error: null,

  // Live Matches Partitioned by Tournament Public ID
  liveMatchesByTournament: {},
  liveMatchesById: {},

  // Active Single Match View
  activeMatch: null,
  activeMatchEvents: [],
  activeMatchEventsPagination: {
    hasMore: true,
    nextCursor: null
  }
};

const tournamentSlice = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setTournamentsLoading: (state, action) => {
      state.loading = action.payload;
    },
    setTournamentsFeed: (state, action) => {
      const { items, pagination, isAppend } = action.payload;
      if (!isAppend) {
        state.tournamentsById = {};
        state.allTournamentIds = [];
      }
      items.forEach((item) => {
        state.tournamentsById[item.id] = item;
        if (!state.allTournamentIds.includes(item.id)) {
          state.allTournamentIds.push(item.id);
        }
      });
      state.feedPagination = pagination;
      state.loading = false;
      state.error = null;
    },
    setTournamentLiveMatches: (state, action) => {
      const { tournamentId, matches } = action.payload;
      const matchIds = [];
      matches.forEach((m) => {
        matchIds.push(m.id);
        state.liveMatchesById[m.id] = m;
      });
      state.liveMatchesByTournament[tournamentId] = matchIds;
    },
    // Micro-update for a single match without triggering full page re-renders
    updateLiveMatchSummary: (state, action) => {
      const { matchId, liveScoreSummary, liveSubtext, status } = action.payload;
      if (state.liveMatchesById[matchId]) {
        state.liveMatchesById[matchId].score = {
          ...state.liveMatchesById[matchId].score,
          summary: liveScoreSummary,
          subtext: liveSubtext
        };
        if (status) state.liveMatchesById[matchId].status = status;
      }
      if (state.activeMatch && state.activeMatch.id === matchId) {
        state.activeMatch.score = {
          ...state.activeMatch.score,
          summary: liveScoreSummary,
          subtext: liveSubtext
        };
        if (status) state.activeMatch.status = status;
      }
    },
    setActiveMatch: (state, action) => {
      state.activeMatch = action.payload;
    },
    setActiveMatchEvents: (state, action) => {
      const { items, pagination, isAppend } = action.payload;
      if (isAppend) {
        state.activeMatchEvents = [...state.activeMatchEvents, ...items];
      } else {
        state.activeMatchEvents = items;
      }
      state.activeMatchEventsPagination = pagination;
    },
    appendMatchEvent: (state, action) => {
      const newEvent = action.payload;
      state.activeMatchEvents.unshift(newEvent);
    },
    clearActiveMatch: (state) => {
      state.activeMatch = null;
      state.activeMatchEvents = [];
      state.activeMatchEventsPagination = { hasMore: true, nextCursor: null };
    }
  }
});

export const {
  setTournamentsLoading,
  setTournamentsFeed,
  setTournamentLiveMatches,
  updateLiveMatchSummary,
  setActiveMatch,
  setActiveMatchEvents,
  appendMatchEvent,
  clearActiveMatch
} = tournamentSlice.actions;

export default tournamentSlice.reducer;
