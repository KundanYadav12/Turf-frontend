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
        if (m.uuid) {
          state.liveMatchesById[m.uuid] = m;
        }
      });
      state.liveMatchesByTournament[tournamentId] = matchIds;
    },
    // Micro-update for a single match without triggering full page re-renders
    updateLiveMatchSummary: (state, action) => {
      const { matchId, liveScoreSummary, liveSubtext, status, scoreSummary, subtext, sportState, scores } = action.payload;
      const summary = scoreSummary || liveScoreSummary;
      const sub = subtext !== undefined ? subtext : liveSubtext;

      const targetMatches = [];
      if (matchId && state.liveMatchesById[matchId]) targetMatches.push(state.liveMatchesById[matchId]);
      if (action.payload.uuid && state.liveMatchesById[action.payload.uuid] && !targetMatches.includes(state.liveMatchesById[action.payload.uuid])) {
        targetMatches.push(state.liveMatchesById[action.payload.uuid]);
      }
      if (action.payload.id && state.liveMatchesById[action.payload.id] && !targetMatches.includes(state.liveMatchesById[action.payload.id])) {
        targetMatches.push(state.liveMatchesById[action.payload.id]);
      }
      if (targetMatches.length === 0) {
        Object.values(state.liveMatchesById).forEach(m => {
          if (m && (String(m.id) === String(matchId) || String(m.uuid) === String(matchId))) {
            targetMatches.push(m);
          }
        });
      }

      targetMatches.forEach(target => {
        target.score = {
          ...target.score,
          summary: summary || target.score?.summary,
          subtext: sub !== undefined ? sub : target.score?.subtext
        };
        target.live_score_summary = summary || target.live_score_summary;
        target.live_subtext = sub !== undefined ? sub : target.live_subtext;
        if (status) target.status = status;
        if (sportState) target.sportState = sportState;
        if (scores) target.scores = scores;
      });

      if (state.activeMatch) {
        const isMatch = String(state.activeMatch.id) === String(matchId) ||
          String(state.activeMatch.uuid) === String(matchId) ||
          String(state.activeMatch.id) === String(action.payload.id) ||
          String(state.activeMatch.uuid) === String(action.payload.uuid);
        if (isMatch) {
          state.activeMatch.score = {
            ...state.activeMatch.score,
            summary: summary || state.activeMatch.score?.summary,
            subtext: sub !== undefined ? sub : state.activeMatch.score?.subtext
          };
          state.activeMatch.live_score_summary = summary || state.activeMatch.live_score_summary;
          state.activeMatch.live_subtext = sub !== undefined ? sub : state.activeMatch.live_subtext;
          if (status) state.activeMatch.status = status;
          if (sportState) state.activeMatch.sportState = sportState;
          if (scores) state.activeMatch.scores = scores;
        }
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
