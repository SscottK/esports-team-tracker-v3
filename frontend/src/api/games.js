import apiClient from './client';

export const getCatalogGames = async () => {
  const response = await apiClient.get('/catalog/games/');
  return response.data;
};

export const getCatalogLevels = async (gameId) => {
  const response = await apiClient.get('/catalog/levels/', { params: { game: gameId } });
  return response.data;
};

export const suggestGame = async (gameName) => {
  const response = await apiClient.post('/game-suggestions/', { game_name: gameName });
  return response.data;
};

export const getAdminGameSuggestions = async (pendingOnly = true) => {
  const response = await apiClient.get('/admin/game-suggestions/', {
    params: pendingOnly ? { pending: 'true' } : {},
  });
  return response.data;
};

export const promoteGameSuggestion = async (suggestionId) => {
  const response = await apiClient.post(`/admin/game-suggestions/${suggestionId}/promote/`);
  return response.data;
};

export const dismissGameSuggestion = async (suggestionId) => {
  const response = await apiClient.post(`/admin/game-suggestions/${suggestionId}/dismiss/`);
  return response.data;
};

export const deleteGameSuggestion = async (suggestionId) => {
  const response = await apiClient.delete(`/admin/game-suggestions/${suggestionId}/`);
  return response.data;
};
