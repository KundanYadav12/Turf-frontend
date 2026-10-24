import API from './api';

export const getAdminDashboardApi = async () => {
  const response = await API.get('/admin/dashboard');
  return response.data;
};

export const getUsersApi = async () => {
  const response = await API.get('/admin/users');
  return response.data;
};

export const updateUserStatusApi = async (userId, status) => {
  const response = await API.patch(`/admin/users/${userId}/status`, { status });
  return response.data;
};

export const getVenuesAdminApi = async () => {
  const response = await API.get('/admin/venues');
  return response.data;
};

export const updateVenueStatusApi = async (venueId, status) => {
  const response = await API.patch(`/admin/venues/${venueId}/status`, { status });
  return response.data;
};

// Tournament View Analytics Superadmin Insights
export const getTournamentAnalyticsOverviewApi = async (params = {}) => {
  const response = await API.get('/admin/tournament-analytics', { params });
  return response.data;
};

export const getTournamentAnalyticsDetailApi = async (tournamentId, params = {}) => {
  const response = await API.get(`/admin/tournament-analytics/${tournamentId}`, { params });
  return response.data;
};
