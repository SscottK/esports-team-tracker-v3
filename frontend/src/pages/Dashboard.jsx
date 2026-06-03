import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import { activityLabel } from '../utils/gameLabels';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

function statusClass(status) {
  if (status === 'fast') return 'grid-cell-fast';
  if (status === 'medium') return 'grid-cell-medium';
  if (status === 'slow') return 'grid-cell-slow';
  return '';
}

function formatShortDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { teams } = useNav();
  const location = useLocation();
  const [gameOptions, setGameOptions] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [times, setTimes] = useState([]);
  const [history, setHistory] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [error, setError] = useState('');

  const selectedGame = useMemo(
    () => gameOptions.find((entry) => String(entry.game.id) === String(selectedGameId)),
    [gameOptions, selectedGameId],
  );
  const availableTeams = selectedGame?.teams ?? [];
  const selectedTeam = useMemo(
    () => availableTeams.find((team) => String(team.id) === String(selectedTeamId)),
    [availableTeams, selectedTeamId],
  );
  const trackLabel = activityLabel(selectedGame?.game, false);
  const completedTracks = times.length;
  const completionPct = totalTracks > 0 ? Math.round((completedTracks / totalTracks) * 100) : 0;
  const par1Count = times.filter((entry) => entry.status === 'fast').length;
  const par2Count = times.filter((entry) => entry.status === 'fast' || entry.status === 'medium').length;

  useEffect(() => {
    const loadGames = async () => {
      setLoadingGames(true);
      setError('');
      try {
        const gameMap = new Map();
        await Promise.all(
          teams.map(async (team) => {
            const teamGames = await teamApi.getTeamGames(team.id);
            teamGames.forEach(({ game }) => {
              if (!gameMap.has(game.id)) {
                gameMap.set(game.id, { game, teams: [] });
              }
              const entry = gameMap.get(game.id);
              if (!entry.teams.some((item) => item.id === team.id)) {
                entry.teams.push({ id: team.id, name: team.name });
              }
            });
          }),
        );
        const options = Array.from(gameMap.values()).sort((a, b) => (
          a.game.name.localeCompare(b.game.name)
        ));
        setGameOptions(options);
        if (options.length > 0) {
          setSelectedGameId((current) => (
            current && options.some((entry) => String(entry.game.id) === String(current))
              ? current
              : String(options[0].game.id)
          ));
        } else {
          setSelectedGameId('');
          setSelectedTeamId('');
        }
      } catch (err) {
        setError('Unable to load your games.');
      } finally {
        setLoadingGames(false);
      }
    };

    loadGames();
  }, [teams]);

  useEffect(() => {
    if (!selectedGame) {
      setSelectedTeamId('');
      return;
    }
    setSelectedTeamId((current) => (
      current && selectedGame.teams.some((team) => String(team.id) === String(current))
        ? current
        : String(selectedGame.teams[0]?.id || '')
    ));
  }, [selectedGameId, selectedGame]);

  useEffect(() => {
    if (!selectedGameId || !selectedTeamId || !user?.id) {
      setTimes([]);
      setHistory([]);
      setTotalTracks(0);
      return;
    }

    const loadTimes = async () => {
      setLoadingTimes(true);
      setError('');
      try {
        const [grid, historyData] = await Promise.all([
          performancesApi.getTeamGrid(selectedTeamId, selectedGameId, {
            includeCoachCompetitors: true,
            includeDlc: true,
          }),
          performancesApi.getTimeHistory(selectedTeamId, {
            game_id: selectedGameId,
            user_id: user.id,
          }).catch(() => []),
        ]);

        const userTimes = grid.levels
          .map((level) => {
            const cell = level.results[String(user.id)];
            if (!cell?.display) {
              return null;
            }
            return {
              id: level.id,
              name: level.name,
              levelGroup: level.level_group,
              isDlc: level.is_dlc,
              display: cell.display,
              status: cell.status,
            };
          })
          .filter(Boolean);

        setTimes(userTimes);
        setTotalTracks(grid.levels.length);
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (err) {
        setError('Unable to load your times.');
        setTimes([]);
        setHistory([]);
        setTotalTracks(0);
      } finally {
        setLoadingTimes(false);
      }
    };

    loadTimes();
  }, [selectedGameId, selectedTeamId, user?.id]);

  if (loadingGames) {
    return (
      <Page title="Dashboard" className="dashboard-page">
        <div className="dashboard-loading">Loading...</div>
      </Page>
    );
  }

  return (
    <Page title="Dashboard" className="dashboard-page">
      {location.state?.message && <Alert variant="success">{location.state.message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Player hub</p>
          <h2 className="dashboard-welcome">Welcome back, {user?.username}</h2>
          <p className="dashboard-subtitle">Track your best times and recent submissions by game and team.</p>
        </div>
        {gameOptions.length > 0 && (
          <div className="dashboard-hero-filters">
            <Form.Group className="dashboard-filter">
              <Form.Label>Game</Form.Label>
              <Form.Select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="dashboard-select"
              >
                {gameOptions.map(({ game }) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="dashboard-filter">
              <Form.Label>Team</Form.Label>
              <Form.Select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className={`dashboard-select${availableTeams.length <= 1 ? ' dashboard-select-muted' : ''}`}
                disabled={availableTeams.length <= 1}
              >
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        )}
      </div>

      {gameOptions.length === 0 ? (
        <Alert variant="info" className="dashboard-empty-alert">
          You do not have any team games yet. Use the menu to create or join an organization, join a team, and assign games.
        </Alert>
      ) : (
        <>
          <div className="dashboard-toolbar esports-panel">
            <div className="dashboard-stat">
              <span className="dashboard-stat-value">
                {loadingTimes ? '—' : completedTracks}
              </span>
              <span className="dashboard-stat-label">Tracks completed</span>
            </div>
            <div className="dashboard-stat">
              <span className="dashboard-stat-value">
                {loadingTimes ? '—' : `${completionPct}%`}
              </span>
              <span className="dashboard-stat-label">Completion</span>
            </div>
            <div className="dashboard-stat">
              <span className="dashboard-stat-value">
                {loadingTimes ? '—' : par1Count}
              </span>
              <span className="dashboard-stat-label">Par 1</span>
            </div>
            <div className="dashboard-stat">
              <span className="dashboard-stat-value">
                {loadingTimes ? '—' : par2Count}
              </span>
              <span className="dashboard-stat-label">Par 2</span>
            </div>
            {selectedTeam && (
              <Button
                as={Link}
                to={`/teams/${selectedTeamId}/games/${selectedGameId}`}
                variant="outline-primary"
                className="dashboard-cta-btn"
              >
                Open team grid
              </Button>
            )}
          </div>

          {loadingTimes ? (
            <div className="dashboard-loading">Loading your times...</div>
          ) : (
            <div className="dashboard-columns">
              <section className="esports-panel dashboard-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h3 className="dashboard-panel-title">Your best times</h3>
                    <p className="dashboard-panel-meta">
                      {selectedGame?.game.name}
                      {selectedTeam && ` · ${selectedTeam.name}`}
                    </p>
                  </div>
                </div>

                {times.length === 0 ? (
                  <p className="dashboard-empty-copy">
                    No recorded times for this game on {selectedTeam?.name} yet.
                  </p>
                ) : (
                  <div className="dashboard-times-list">
                    {times.map((entry) => (
                      <div key={entry.id} className="dashboard-time-row">
                        <div className="dashboard-time-track">
                          {entry.levelGroup && (
                            <span className="dashboard-time-cup">{entry.levelGroup}</span>
                          )}
                          <span className="dashboard-time-name">{entry.name}</span>
                          {entry.isDlc && <Badge className="dashboard-dlc-badge">DLC</Badge>}
                        </div>
                        <span className={`dashboard-time-value ${statusClass(entry.status)}`}>
                          {entry.display}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="esports-panel dashboard-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h3 className="dashboard-panel-title">Time history</h3>
                    <p className="dashboard-panel-meta">Recent submissions</p>
                  </div>
                  {selectedTeam && (
                    <Button
                      as={Link}
                      to={`/teams/${selectedTeamId}/time-history?game=${selectedGameId}&user=${user.id}`}
                      variant="outline-light"
                      size="sm"
                      className="dashboard-link-btn"
                    >
                      Full history
                    </Button>
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="dashboard-empty-copy">
                    No submission history yet for this game on this team.
                  </p>
                ) : (
                  <div className="dashboard-history-list">
                    {history.slice(0, 12).map((entry) => (
                      <div key={entry.id} className="dashboard-history-row">
                        <span className="dashboard-history-date">{formatShortDate(entry.created_at)}</span>
                        <span className="dashboard-history-track">
                          {entry.level_group_name ? `${entry.level_group_name} · ` : ''}
                          {entry.level_name}
                        </span>
                        <span className="dashboard-history-time">{entry.display_value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
