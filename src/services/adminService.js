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

// Mobile App Update Management APIs
export const getAppUpdateAnalyticsApi = async () => {
  const response = await API.get('/admin/mobile-updates/analytics');
  return response.data;
};

export const getAppReleasesApi = async (params = {}) => {
  const response = await API.get('/admin/mobile-updates/releases', { params });
  return response.data;
};

export const createAppReleaseApi = async (formData) => {
  const response = await API.post('/admin/mobile-updates/releases', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const publishAppReleaseApi = async (releaseId) => {
  const response = await API.post(`/admin/mobile-updates/releases/${releaseId}/publish`);
  return response.data;
};

export const rollbackAppReleaseApi = async (releaseId) => {
  const response = await API.post(`/admin/mobile-updates/releases/${releaseId}/rollback`);
  return response.data;
};

export const deleteAppReleaseApi = async (releaseId) => {
  const response = await API.delete(`/admin/mobile-updates/releases/${releaseId}`);
  return response.data;
};

// Software Branding Management APIs
export const getBrandingAdminApi = async () => {
  const response = await API.get('/admin/branding');
  return response.data;
};

export const updateBrandingAdminApi = async (formData) => {
  const response = await API.put('/admin/branding', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const resetBrandingAdminApi = async () => {
  const response = await API.post('/admin/branding/reset');
  return response.data;
};

export const getBrandingAuditLogsApi = async (params = {}) => {
  const response = await API.get('/admin/branding/audit-logs', { params });
  return response.data;
};

export const getPublicBrandingApi = async () => {
  const response = await API.get('/branding');
  return response.data;
};

