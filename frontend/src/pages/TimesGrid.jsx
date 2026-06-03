import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Page from '../components/Page';
import BackButton from '../components/BackButton';
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

  const handleTeamChange = (nextTeamId) => {
    if (String(nextTeamId) !== String(teamId)) {
      navigate(`/teams/${nextTeamId}/games/${gameId}`);
    }
  };

  return (
    <Page
      title={grid ? `${teamName} — ${grid.game.name}` : 'Times grid'}
      className="dashboard-page"
      actions={(
        <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-sm-auto">
          <Button as={Link} to={`/teams/${teamId}/games/${gameId}/compare`} variant="outline-primary">
            Compare
          </Button>
          <Button as={Link} to={`/teams/${teamId}/time-history?game=${gameId}`} variant="outline-primary">
            Time history
          </Button>
          {viewer?.can_add_time && (
            <Button as={Link} to={`/teams/${teamId}/add-time?game=${gameId}`} variant="outline-primary">
              Add time
            </Button>
          )}
          {viewer?.is_coach && (
            <Button as={Link} to={`/teams/${teamId}/upload-times?game=${gameId}`} variant="outline-primary">
              Upload CSV
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
        <p>Loading grid...</p>
      ) : (
        <>
          {viewer?.can_toggle_dlc && (
            <Form.Check
              type="switch"
              id="include-dlc-tracks"
              className="mb-3"
              label="Show DLC tracks (Booster Course Pass)"
              checked={includeDlc}
              onChange={(e) => setIncludeDlc(e.target.checked)}
            />
          )}

          {viewer?.can_toggle_coach_competitors && (
            <Form.Check
              type="switch"
              id="include-coach-competitors"
              className="mb-3"
              label="Show coach times (coaches who also compete)"
              checked={includeCoachCompetitors}
              onChange={(e) => setIncludeCoachCompetitors(e.target.checked)}
            />
          )}

          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Leaderboard</Card.Title>
              <LeaderboardTable leaderboard={leaderboard} game={grid.game} />
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body className="pb-0">
              <Card.Title>{trackLabel} times</Card.Title>
              <p className="text-muted small mb-0">
                DLC tracks show by default. Turn off the toggle to hide Booster Course Pass cups.
                Only competing team members are shown unless coach times are toggled above.
              </p>
            </Card.Body>
          </Card>

          <div className="d-none d-md-block">
            <TimesGridTable grid={grid} />
          </div>
          <MobileGridCards grid={grid} />
        </>
      )}
    </Page>
  );
}
