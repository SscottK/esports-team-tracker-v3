import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { activityLabel } from '../utils/gameLabels';
import * as gamesApi from '../api/games';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

export default function SetBenchmarks() {
  const { teamId } = useParams();
  const [teamGames, setTeamGames] = useState([]);
  const [levels, setLevels] = useState([]);
  const [gameId, setGameId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [targetFast, setTargetFast] = useState('');
  const [targetSlow, setTargetSlow] = useState('');
  const [elite, setElite] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedGame = useMemo(
    () => teamGames.find(({ game }) => String(game.id) === String(gameId))?.game,
    [teamGames, gameId],
  );
  const trackLabel = activityLabel(selectedGame, false);

  useEffect(() => {
    teamApi.getTeamGames(teamId).then(setTeamGames).catch(() => setError('Unable to load team games.'));
  }, [teamId]);

  useEffect(() => {
    if (!gameId) {
      setLevels([]);
      return;
    }
    gamesApi.getCatalogLevels(gameId).then(setLevels);
  }, [gameId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await performancesApi.setBenchmark({
        team: Number(teamId),
        level: Number(levelId),
        target_fast: targetFast || null,
        target_slow: targetSlow || null,
        elite: elite || null,
      });
      setSuccess('Benchmarks saved.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to save benchmarks. Coaches only.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Set benchmarks"
      actions={<BackButton fallback={`/teams/${teamId}/coach`} />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <h3 className="coach-tools-section-title">Par targets</h3>
        <p className="form-page-intro">
          Set Par 1, Par 2, and elite targets per {trackLabel.toLowerCase() || 'track'} for this team.
        </p>
        <Form onSubmit={handleSubmit} className="coach-tools-form">
          <Form.Group>
            <Form.Label>Game</Form.Label>
            <Form.Select value={gameId} onChange={(e) => setGameId(e.target.value)} required>
              <option value="">Select game</option>
              {teamGames.map(({ game }) => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>{trackLabel || 'Track'}</Form.Label>
            <Form.Select value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
              <option value="">Select {trackLabel.toLowerCase() || 'track'}</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.level_group_name ? `${level.level_group_name} — ${level.name}` : level.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Par 1 (fast target)</Form.Label>
            <Form.Control value={targetFast} onChange={(e) => setTargetFast(e.target.value)} placeholder="1:44.308" />
          </Form.Group>
          <Form.Group>
            <Form.Label>Par 2 (slow target)</Form.Label>
            <Form.Control value={targetSlow} onChange={(e) => setTargetSlow(e.target.value)} placeholder="1:49.917" />
          </Form.Group>
          <Form.Group>
            <Form.Label>Elite / world record</Form.Label>
            <Form.Control value={elite} onChange={(e) => setElite(e.target.value)} placeholder="1:33.966" />
          </Form.Group>
          <Button type="submit" variant="outline-primary" disabled={busy}>
            Save benchmarks
          </Button>
        </Form>
      </section>
    </Page>
  );
}
