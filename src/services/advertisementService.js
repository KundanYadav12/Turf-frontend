import API from './api';

export const getActiveSignageAdsApi = async (tournamentId = null, venueId = null, device = null) => {
  let tId = tournamentId;
  let vId = venueId;
  let dev = device;
  if (tournamentId && typeof tournamentId === 'object') {
    tId = tournamentId.tournamentId;
    vId = tournamentId.venueId;
    dev = tournamentId.device;
  }
  const params = new URLSearchParams();
  if (tId) params.append('tournamentId', tId);
  if (vId) params.append('venueId', vId);
  if (dev) params.append('device', dev);
  const qs = params.toString();
  const url = qs ? `/advertisements/active?${qs}` : '/advertisements/active';
  const response = await API.get(url);
  return response.data;
};

export const getAdPlaybackStateApi = async () => {
  const response = await API.get('/advertisements/state');
  return response.data;
};

export const getAllAdsAdminApi = async () => {
  const response = await API.get('/advertisements');
  return response.data;
};

export const createAdAdminApi = async (formData) => {
  const response = await API.post('/advertisements', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const updateAdAdminApi = async (id, data) => {
  const isFormData = data instanceof FormData;
  const response = await API.put(`/advertisements/${id}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
  });
  return response.data;
};

export const deleteAdAdminApi = async (id) => {
  const response = await API.delete(`/advertisements/${id}`);
  return response.data;
};

export const controlAdsAdminApi = async (action, payload = {}) => {
  const response = await API.post('/advertisements/control', { action, payload });
  return response.data;
};

export const getStreamAdsApi = async ({ matchId = null, tournamentId = null, venueId = null } = {}) => {
  const params = new URLSearchParams();
  if (matchId) params.append('matchId', matchId);
  if (tournamentId) params.append('tournamentId', tournamentId);
  if (venueId) params.append('venueId', venueId);
  const qs = params.toString();
  const url = qs ? `/advertisements/stream?${qs}` : '/advertisements/stream';
  const response = await API.get(url);
  return response.data;
};

export const getMatchBreakApi = async (matchId) => {
  if (!matchId) return { success: false, data: { isBreak: false } };
  const response = await API.get(`/matches/${matchId}/break`);
  return response.data;
};

export const startMatchBreakApi = async (matchId, { reason = 'Interval', durationMinutes = null } = {}) => {
  if (!matchId) return { success: false };
  const response = await API.post(`/matches/${matchId}/break/start`, { reason, durationMinutes });
  return response.data;
};

export const endMatchBreakApi = async (matchId) => {
  if (!matchId) return { success: false };
  const response = await API.post(`/matches/${matchId}/break/end`);
  return response.data;
};
