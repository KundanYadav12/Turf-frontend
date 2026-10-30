import API from './api';

export const loginApi = async (credentials) => {
  const response = await API.post('/auth/login', credentials);
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await API.post('/auth/register', userData);
  return response.data;
};

export const getMeApi = async () => {
  const response = await API.get('/auth/me');
  return response.data;
};

export const forgotPasswordApi = async (data) => {
  const response = await API.post('/auth/forgot-password', data);
  return response.data;
};

export const verifyResetCodeApi = async (data) => {
  const response = await API.post('/auth/verify-reset-code', data);
  return response.data;
};

export const resetPasswordApi = async (data) => {
  const response = await API.post('/auth/reset-password', data);
  return response.data;
};

