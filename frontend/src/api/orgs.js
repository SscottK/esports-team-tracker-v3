import apiClient from './client';

export const getMyOrganizations = async () => {
  const response = await apiClient.get('/organizations/me/');
  return response.data.organizations;
};

export const createOrganization = async (name) => {
  const response = await apiClient.post('/organizations/me/', { name });
  return response.data;
};

export const requestOrgJoin = async (code) => {
  const response = await apiClient.post('/organizations/join/', { code });
  return response.data;
};

export const getMyOrgJoinRequests = async () => {
  const response = await apiClient.get('/organizations/me/join-requests/');
  return response.data;
};

export const getOrgJoinRequests = async (orgId) => {
  const response = await apiClient.get(`/organizations/${orgId}/join-requests/`);
  return response.data;
};

export const cancelOrgJoinRequest = async (orgId, requestId) => {
  const response = await apiClient.patch(
    `/organizations/${orgId}/join-requests/${requestId}/`,
    { action: 'cancel' },
  );
  return response.data;
};

export const reviewOrgJoinRequest = async (orgId, requestId, payload) => {
  const response = await apiClient.patch(
    `/organizations/${orgId}/join-requests/${requestId}/`,
    payload,
  );
  return response.data;
};

export const getOrgMembers = async (orgId) => {
  const response = await apiClient.get(`/organizations/${orgId}/members/`);
  return response.data;
};

export const updateOrgMember = async (orgId, membershipId, payload) => {
  const response = await apiClient.patch(
    `/organizations/${orgId}/members/${membershipId}/`,
    payload,
  );
  return response.data;
};

export const regenerateJoinCode = async (orgId) => {
  const response = await apiClient.post(`/organizations/${orgId}/members/`);
  return response.data.join_code;
};

export const leaveOrganization = async (orgId, payload = {}) => {
  const response = await apiClient.post(`/organizations/${orgId}/leave/`, payload);
  return response.data;
};

export const getOrgTeamMigrationRequests = async (orgId) => {
  const response = await apiClient.get(`/organizations/${orgId}/team-migration-requests/`);
  return response.data;
};

export const getOrgOutgoingTeamMigrationRequests = async (orgId) => {
  const response = await apiClient.get(`/organizations/${orgId}/outgoing-team-migration-requests/`);
  return response.data;
};

export const reviewOrgOutgoingTeamMigrationRequest = async (orgId, requestId, payload) => {
  const response = await apiClient.patch(
    `/organizations/${orgId}/outgoing-team-migration-requests/${requestId}/`,
    payload,
  );
  return response.data;
};

export const reviewOrgTeamMigrationRequest = async (orgId, requestId, payload) => {
  const response = await apiClient.patch(
    `/organizations/${orgId}/team-migration-requests/${requestId}/`,
    payload,
  );
  return response.data;
};
