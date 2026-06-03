import apiClient from './client';

const storeTokens = ({ access, refresh }) => {
  localStorage.setItem('estt_access_token', access);
  localStorage.setItem('estt_refresh_token', refresh);
};

export const register = async ({ username, email, password, password_confirm }) => {
  await apiClient.post('/auth/register/', {
    username,
    email,
    password,
    password_confirm,
  });
  return login({ username, password });
};

export const login = async ({ username, password }) => {
  const response = await apiClient.post('/auth/login/', { username, password });
  storeTokens(response.data);
  return getMe();
};

export const logout = () => {
  localStorage.removeItem('estt_access_token');
  localStorage.removeItem('estt_refresh_token');
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me/');
  return response.data;
};

export const isAuthenticated = () => Boolean(localStorage.getItem('estt_access_token'));

export const checkHealth = async () => {
  const response = await apiClient.get('/health/');
  return response.data;
};

export const createPasswordResetRequest = async ({ username, contact_email = '', message = '' }) => {
  const response = await apiClient.post('/auth/password-reset-requests/', {
    username,
    contact_email,
    message,
  });
  return response.data;
};
