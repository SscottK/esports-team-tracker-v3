import apiClient from './client';

export const getRequestInbox = async () => {
  const response = await apiClient.get('/requests/inbox/');
  return response.data;
};
