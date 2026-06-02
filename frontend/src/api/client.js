import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('estt_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const refreshToken = localStorage.getItem('estt_refresh_token');
    if (!refreshToken) {
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/refresh/`, {
        refresh: refreshToken,
      });
      localStorage.setItem('estt_access_token', response.data.access);
      originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem('estt_access_token');
      localStorage.removeItem('estt_refresh_token');
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
