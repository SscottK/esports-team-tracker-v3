import apiClient from './client';

const gridParams = ({ includeCoachCompetitors = false, includeDlc = false } = {}) => ({
  include_coach_competitors: includeCoachCompetitors,
  include_dlc: includeDlc,
});

export const getTeamGrid = async (teamId, gameId, options = {}) => {
  const response = await apiClient.get(`/teams/${teamId}/games/${gameId}/grid/`, {
    params: gridParams(options),
  });
  return response.data;
};

export const getTeamCompare = async (teamId, gameId, options = {}) => {
  const response = await apiClient.get(`/teams/${teamId}/games/${gameId}/compare/`, {
    params: gridParams(options),
  });
  return response.data;
};

export const getTeamLeaderboard = async (teamId, gameId, options = {}) => {
  const response = await apiClient.get(`/teams/${teamId}/games/${gameId}/leaderboard/`, {
    params: gridParams(options),
  });
  return response.data;
};

export const submitResult = async ({ team, level, time_input, user_id }) => {
  const payload = { team, level, time_input };
  if (user_id) {
    payload.user_id = user_id;
  }
  const response = await apiClient.post('/results/', payload);
  return response.data;
};

export const setBenchmark = async ({ team, level, target_fast, target_slow, elite }) => {
  const response = await apiClient.post(`/teams/${team}/benchmarks/`, {
    level,
    target_fast,
    target_slow,
    elite,
  });
  return response.data;
};

export const getBenchmarks = async (teamId) => {
  const response = await apiClient.get(`/teams/${teamId}/benchmarks/`);
  return response.data;
};

export const getTimeHistory = async (teamId, params = {}) => {
  const response = await apiClient.get(`/teams/${teamId}/time-history/`, { params });
  return response.data;
};

export const uploadTimesCsv = async (teamId, gameId, file) => {
  const formData = new FormData();
  formData.append('game_id', gameId);
  formData.append('file', file);
  const response = await apiClient.post(`/teams/${teamId}/times-csv/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
