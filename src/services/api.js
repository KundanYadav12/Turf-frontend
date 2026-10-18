import axios from 'axios';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';
  return `${backend}/api`;
};

const API = axios.create({
  baseURL: getBaseURL()
});

API.interceptors.request.use((config) => {
  // Update baseURL dynamically if needed based on runtime environment
  config.baseURL = getBaseURL();

  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('turf_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore in safe environments
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
