import apiClient from './client';

export const lookupUser = async (username) => {
  const response = await apiClient.get('/users/lookup/', {
    params: { username },
  });
  return response.data;
};
