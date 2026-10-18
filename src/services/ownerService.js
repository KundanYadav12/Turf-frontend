import API from './api';

export const getOwnerDashboardApi = async () => {
  const response = await API.get('/owner/dashboard');
  return response.data;
};

export const getOwnerCalendarApi = async (date) => {
  const response = await API.get('/owner/calendar', { params: { date } });
  return response.data;
};

export const toggleBlockSlotApi = async (courtId, payload) => {
  const response = await API.post(`/courts/${courtId}/slots/block`, payload);
  return response.data;
};

export const createOfflineBookingApi = async (payload) => {
  const response = await API.post('/bookings/offline-walkin', payload);
  return response.data;
};
