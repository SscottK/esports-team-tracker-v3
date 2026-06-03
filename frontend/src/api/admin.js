import apiClient from './client';

export const getPasswordResetRequests = async (showReviewed = false) => {
  const response = await apiClient.get('/admin/password-reset-requests/', {
    params: showReviewed ? { show_reviewed: 'true' } : undefined,
  });
  return response.data;
};

export const reviewPasswordResetRequest = async (requestId, payload) => {
  const response = await apiClient.patch(`/admin/password-reset-requests/${requestId}/`, payload);
  return response.data;
};
