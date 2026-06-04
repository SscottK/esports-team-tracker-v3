const STORAGE_KEY = 'estt_last_grid_games';

function readMap() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function rememberLastGridGame(teamId, gameId) {
  if (!teamId || !gameId) {
    return;
  }
  const map = readMap();
  map[String(teamId)] = String(gameId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function resolveGridGameId(teamId, assignedGameIds) {
  if (!assignedGameIds?.length) {
    return null;
  }
  const normalized = assignedGameIds.map(String);
  const last = readMap()[String(teamId)];
  if (last && normalized.includes(last)) {
    return last;
  }
  return normalized[0];
}

export function gridPathForTeam(teamId, teamGames) {
  const gameIds = teamGames.map(({ game }) => game.id);
  const gameId = resolveGridGameId(teamId, gameIds);
  return gameId ? `/teams/${teamId}/games/${gameId}` : null;
}
