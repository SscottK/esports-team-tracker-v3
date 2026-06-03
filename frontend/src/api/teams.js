import apiClient from './client';

export const getTeams = async () => {
  const response = await apiClient.get('/teams/');
  return response.data;
};

export const createTeam = async ({ name, organization }) => {
  const response = await apiClient.post('/teams/', { name, organization });
  return response.data;
};

export const getTeamMembers = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/members/`);
  return response.data;
};

export const addTeamMember = async (teamId, payload) => {
  const response = await apiClient.post(`/teams/${teamId}/members/`, payload);
  return response.data;
};

export const updateTeamMember = async (teamId, membershipId, payload) => {
  const response = await apiClient.patch(`/teams/${teamId}/members/${membershipId}/`, payload);
  return response.data;
};

export const getTeamGames = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/games/`);
  return response.data;
};

export const addTeamGame = async (teamId, gameId) => {
  const response = await apiClient.post(`/teams/${teamId}/games/`, { game_id: gameId });
  return response.data;
};

export const getTeam = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/`);
  return response.data;
};

export const updateTeamColors = async (teamId, colors) => {
  const response = await apiClient.patch(`/teams/${teamId}/`, colors);
  return response.data;
};

export const leaveTeam = async (teamId, payload = {}) => {
  const response = await apiClient.post(`/teams/${teamId}/leave/`, payload);
  return response.data;
};

export const getOrgTeams = async (orgId) => {
  const response = await apiClient.get(`/organizations/${orgId}/teams/`);
  return response.data;
};

export const requestTeamJoin = async (teamId) => {
  const response = await apiClient.post(`/teams/${teamId}/join-requests/`);
  return response.data;
};

export const cancelTeamJoinRequest = async (teamId, requestId) => {
  const response = await apiClient.patch(`/teams/${teamId}/join-requests/${requestId}/`, {
    action: 'cancel',
  });
  return response.data;
};

export const getTeamJoinRequests = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/join-requests/`);
  return response.data;
};

export const reviewTeamJoinRequest = async (teamId, requestId, payload) => {
  const response = await apiClient.patch(`/teams/${teamId}/join-requests/${requestId}/`, payload);
  return response.data;
};

export const getTeamInvites = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/invites/`);
  return response.data;
};

export const sendTeamInvite = async (teamId, username) => {
  const response = await apiClient.post(`/teams/${teamId}/invites/`, { username });
  return response.data;
};

export const respondTeamInvite = async (teamId, inviteId, action) => {
  const response = await apiClient.patch(`/teams/${teamId}/invites/${inviteId}/`, { action });
  return response.data;
};

export const getTeamMigrationRequests = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/migration-requests/`);
  return response.data;
};

export const requestTeamMigration = async (teamId, joinCode) => {
  const response = await apiClient.post(`/teams/${teamId}/migration-requests/`, {
    join_code: joinCode,
  });
  return response.data;
};

export const cancelTeamMigrationRequest = async (teamId, requestId) => {
  const response = await apiClient.patch(`/teams/${teamId}/migration-requests/${requestId}/`, {
    action: 'cancel',
  });
  return response.data;
};
