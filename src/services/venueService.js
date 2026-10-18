import API from './api';

export const getSportsApi = async () => {
  const response = await API.get('/sports');
  return response.data;
};

export const getVenuesApi = async (params = {}) => {
  const response = await API.get('/venues', { params });
  return response.data;
};

export const getVenueDetailsApi = async (idOrSlug) => {
  const response = await API.get(`/venues/${idOrSlug}`);
  return response.data;
};

export const createVenueApi = async (formData) => {
  const response = await API.post('/venues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
