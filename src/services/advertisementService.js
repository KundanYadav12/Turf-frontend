import API from './api';

export const getActiveSignageAdsApi = async (tournamentId = null, venueId = null) => {
  let tId = tournamentId;
  let vId = venueId;
  if (tournamentId && typeof tournamentId === 'object') {
    tId = tournamentId.tournamentId;
    vId = tournamentId.venueId;
  }
  const params = new URLSearchParams();
  if (tId) params.append('tournamentId', tId);
  if (vId) params.append('venueId', vId);
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
