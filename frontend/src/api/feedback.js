import apiClient from './client';

export const submitBetaFeedback = async (payload) => {
  const response = await apiClient.post('/feedback/', payload);
  return response.data;
};
