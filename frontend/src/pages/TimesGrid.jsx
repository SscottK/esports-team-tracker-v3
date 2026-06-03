import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Page from '../components/Page';
import BackButton from '../components/BackButton';
import PageLinksMenu from '../components/PageLinksMenu';
import TimesGridTable, { LeaderboardTable, MobileGridCards } from '../components/TimesGridTable';
import { useNav } from '../context/NavContext';
import { activityLabel } from '../utils/gameLabels';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

export default function TimesGrid() {
  const { teamId, gameId } = useParams();
  const navigate = useNavigate();
  const { teams } = useNav();
  const [grid, setGrid] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [teamsWithGame, setTeamsWithGame] = useState([]);
  const [includeCoachCompetitors, setIncludeCoachCompetitors] = useState(false);
  const [includeDlc, setIncludeDlc] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamOptions = async () => {
      const matches = await Promise.all(
        teams.map(async (team) => {
          try {
            const teamGames = await teamApi.getTeamGames(team.id);
            return teamGames.some(({ game }) => String(game.id) === String(gameId))
              ? { id: team.id, name: team.name }
              : null;
          } catch {
            return null;
          }
        }),
      );
      setTeamsWithGame(matches.filter(Boolean));
    };

    if (teams.length > 0) {
      loadTeamOptions();
    } else {
      setTeamsWithGame([]);
    }
  }, [teams, gameId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [gridData, leaderboardData, team] = await Promise.all([
          performancesApi.getTeamGrid(teamId, gameId, { includeCoachCompetitors, includeDlc }),
          performancesApi.getTeamLeaderboard(teamId, gameId, { includeCoachCompetitors, includeDlc }),
          teamApi.getTeam(teamId),
        ]);
        setGrid(gridData);
        setLeaderboard(leaderboardData.leaderboard);
        setViewer(gridData.viewer);
        setTeamName(team.name);
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load times grid.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId, gameId, includeCoachCompetitors, includeDlc]);

  const trackLabel = activityLabel(grid?.game, true);
  const showTeamSwitcher = teamsWithGame.length > 1;
  const showGridToggles = viewer?.can_toggle_dlc || viewer?.can_toggle_coach_competitors;

  const handleTeamChange = (nextTeamId) => {
    if (String(nextTeamId) !== String(teamId)) {
      navigate(`/teams/${nextTeamId}/games/${gameId}`);
    }
  };

  const gridPageLinks = [
    { label: 'Compare', to: `/teams/${teamId}/games/${gameId}/compare` },
    { label: 'Time history', to: `/teams/${teamId}/time-history?game=${gameId}` },
  ];
  if (viewer?.can_add_time) {
    gridPageLinks.push({ label: 'Add time', to: `/teams/${teamId}/add-time?game=${gameId}` });
  }
  if (viewer?.is_coach) {
    gridPageLinks.push({ label: 'Upload CSV', to: `/teams/${teamId}/upload-times?game=${gameId}` });
  }

  return (
    <Page
      title={grid ? `${teamName} — ${grid.game.name}` : 'Times grid'}
      className="dashboard-page"
      actions={(
        <div className="page-header-actions page-header-actions--compact">
          <PageLinksMenu label="More pages" links={gridPageLinks} />
          {viewer?.is_coach && (
            <Button as={Link} to={`/teams/${teamId}/coach`} variant="outline-primary" size="sm">
              Coach tools
            </Button>
          )}
          <BackButton fallback="/dashboard" />
        </div>
      )}
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {showTeamSwitcher && (
        <div className="grid-team-switcher esports-panel mb-3">
          <Form.Group className="mb-0">
            <Form.Label className="grid-team-switcher-label">Team</Form.Label>
            <Form.Select
              value={teamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="dashboard-select"
            >
              {teamsWithGame.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <p className="grid-team-switcher-note mb-0">
            This game is assigned to multiple teams you are on. Switch teams to view a different roster grid.
          </p>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">Loading grid...</div>
      ) : grid ? (
        <>
          <section className="esports-panel times-grid-accordion mb-3">
            <button
              type="button"
              className="times-grid-accordion-trigger"
              onClick={() => setShowLeaderboard((open) => !open)}
              aria-expanded={showLeaderboard}
              aria-controls="times-grid-leaderboard-panel"
            >
              <span className="times-grid-accordion-title">Leaderboard</span>
            </button>
            {showLeaderboard && (
              <div id="times-grid-leaderboard-panel" className="times-grid-accordion-body">
                <LeaderboardTable leaderboard={leaderboard} game={grid.game} />
              </div>
            )}
          </section>

          <section className="esports-panel times-grid-main-panel">
            <div className="times-grid-section-head">
              <div className="times-grid-section-head-row">
                <h2 className="dashboard-panel-title mb-0">{trackLabel} times</h2>
                {showGridToggles && (
                  <div className="times-grid-section-toggles">
                    {viewer?.can_toggle_dlc && (
                      <Form.Check
                        type="switch"
                        id="include-dlc-tracks"
                        className="times-grid-toggle mb-0"
                        label="Show DLC tracks (Booster Course Pass)"
                        checked={includeDlc}
                        onChange={(e) => setIncludeDlc(e.target.checked)}
                      />
                    )}
                    {viewer?.can_toggle_coach_competitors && (
                      <Form.Check
                        type="switch"
                        id="include-coach-competitors"
                        className="times-grid-toggle mb-0"
                        label="Show coach times (coaches who also compete)"
                        checked={includeCoachCompetitors}
                        onChange={(e) => setIncludeCoachCompetitors(e.target.checked)}
                      />
                    )}
                  </div>
                )}
              </div>
              <p className="dashboard-panel-meta mb-0">
                DLC tracks show by default. Turn off the toggle to hide Booster Course Pass cups.
                Only competing team members are shown unless coach times are enabled.
              </p>
            </div>

            <div className="d-none d-md-block">
              <TimesGridTable grid={grid} />
            </div>
            <MobileGridCards grid={grid} />
          </section>
        </>
      ) : null}
    </Page>
  );
}
