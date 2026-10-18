import API from './api';

export const getCourtSlotsApi = async (courtId, date) => {
  const response = await API.get(`/courts/${courtId}/slots`, { params: { date } });
  return response.data;
};

export const createBookingApi = async (bookingData) => {
  const response = await API.post('/bookings', bookingData);
  return response.data;
};

export const getMyBookingsApi = async () => {
  const response = await API.get('/bookings/my');
  return response.data;
};

export const cancelBookingApi = async (bookingId) => {
  const response = await API.post(`/bookings/${bookingId}/cancel`);
  return response.data;
};

export const applyCouponApi = async (couponData) => {
  const response = await API.post('/coupons/apply', couponData);
  return response.data;
};
