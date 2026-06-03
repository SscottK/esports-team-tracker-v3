import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

export default function UploadTimes() {
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const [teamGames, setTeamGames] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [gameId, setGameId] = useState(searchParams.get('game') || '');
  const [csvFile, setCsvFile] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const isCoach = myMembership?.is_coach;
  const selectedGame = useMemo(
    () => teamGames.find(({ game }) => String(game.id) === String(gameId))?.game,
    [teamGames, gameId],
  );
  const backFallback = gameId
    ? `/teams/${teamId}/games/${gameId}`
    : `/teams/${teamId}/coach`;

  useEffect(() => {
    teamApi.getTeamMembers(teamId)
      .then((memberData) => {
        setMyMembership(memberData.my_membership);
      })
      .catch(() => {
        setError('Unable to load team data.');
      });
    teamApi.getTeamGames(teamId)
      .then(setTeamGames)
      .catch(() => {
        setError('Unable to load assigned games.');
      });
  }, [teamId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!csvFile) {
      setError('Choose a CSV file to upload.');
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    try {
      const uploadResult = await performancesApi.uploadTimesCsv(teamId, gameId, csvFile);
      setResult(uploadResult);
      setCsvFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to upload CSV.');
    } finally {
      setBusy(false);
    }
  };

  if (!myMembership) {
    return (
      <Page title="Upload times" actions={<BackButton fallback={`/teams/${teamId}`} />}>
        <Alert variant="warning">You must be on this team to upload times.</Alert>
      </Page>
    );
  }

  if (!isCoach) {
    return (
      <Page title="Upload times" actions={<BackButton fallback={`/teams/${teamId}`} />}>
        <Alert variant="info">Only coaches can bulk-upload times from CSV.</Alert>
      </Page>
    );
  }

  return (
    <Page
      title="Upload times"
      actions={<BackButton fallback={backFallback} />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {result && (
        <Alert variant={result.imported > 0 ? 'success' : 'warning'}>
          Imported {result.imported} time{result.imported === 1 ? '' : 's'}.
          {result.skipped_levels?.length > 0 && (
            <div className="small mt-2">
              Skipped tracks: {result.skipped_levels.join(', ')}
            </div>
          )}
          {result.skipped_users?.not_found?.length > 0 && (
            <div className="small mt-1">
              Unknown usernames: {result.skipped_users.not_found.join(', ')}
            </div>
          )}
          {result.skipped_users?.not_in_team?.length > 0 && (
            <div className="small mt-1">
              Not on team roster: {result.skipped_users.not_in_team.join(', ')}
            </div>
          )}
          {result.parse_errors?.length > 0 && (
            <div className="small mt-1">
              Parse issues on lines: {result.parse_errors.map((entry) => entry.line).join(', ')}
            </div>
          )}
        </Alert>
      )}

      <section className="esports-panel form-page-panel">
        <h3 className="coach-tools-section-title">Bulk upload from CSV</h3>
        <p className="form-page-intro">
          Use the Mario Kart sheet export format: usernames in row 1 starting at column C,
          cup names in column A, track names in column B, and times in the member columns.
          Only competing roster members are imported.
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
            <Form.Label>CSV file</Form.Label>
            <Form.Control
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              required
            />
            {selectedGame && (
              <Form.Text className="dashboard-panel-meta">
                Track names must match the catalog for {selectedGame.name}.
              </Form.Text>
            )}
          </Form.Group>

          <Button type="submit" variant="outline-primary" disabled={busy}>
            {busy ? 'Uploading...' : 'Upload CSV'}
          </Button>
        </Form>
      </section>
    </Page>
  );
}
