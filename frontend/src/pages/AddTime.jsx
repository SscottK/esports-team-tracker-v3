import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { activityLabel } from '../utils/gameLabels';
import * as gamesApi from '../api/games';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

export default function AddTime() {
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const [teamGames, setTeamGames] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [levels, setLevels] = useState([]);
  const [gameId, setGameId] = useState(searchParams.get('game') || '');
  const [levelId, setLevelId] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const isCoach = myMembership?.is_coach;
  const canSubmitOwnTime = myMembership?.is_competing_member;
  const competingMembers = useMemo(
    () => memberships.filter((membership) => membership.is_competing_member),
    [memberships],
  );

  const selectedGame = useMemo(
    () => teamGames.find(({ game }) => String(game.id) === String(gameId))?.game,
    [teamGames, gameId],
  );
  const trackLabel = activityLabel(selectedGame, false);
  const backFallback = gameId
    ? `/teams/${teamId}/games/${gameId}`
    : `/teams/${teamId}`;

  useEffect(() => {
    Promise.all([
      teamApi.getTeamGames(teamId),
      teamApi.getTeamMembers(teamId),
    ]).then(([games, memberData]) => {
      setTeamGames(games);
      setMemberships(memberData.memberships);
      setMyMembership(memberData.my_membership);
      if (memberData.my_membership?.is_competing_member) {
        setMemberUserId(String(memberData.my_membership.user_id));
      } else if (memberData.memberships.length > 0) {
        const firstCompeting = memberData.memberships.find((entry) => entry.is_competing_member);
        if (firstCompeting) {
          setMemberUserId(String(firstCompeting.user_id));
        }
      }
    }).catch(() => {
      setError('Unable to load team data.');
    });
  }, [teamId]);

  useEffect(() => {
    if (!gameId) {
      setLevels([]);
      setLevelId('');
      return;
    }
    gamesApi.getCatalogLevels(gameId).then(setLevels).catch(() => {
      setError(`Unable to load ${trackLabel.toLowerCase()}s.`);
    });
  }, [gameId, trackLabel]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        team: Number(teamId),
        level: Number(levelId),
        time_input: timeInput,
      };
      if (isCoach && memberUserId) {
        payload.user_id = Number(memberUserId);
      }
      await performancesApi.submitResult(payload);
      setSuccess('Time saved.');
      setTimeInput('');
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.time_input?.[0]
        || data?.detail
        || data?.non_field_errors?.[0]
        || 'Unable to save time.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!myMembership) {
    return (
      <Page title="Add time" actions={<BackButton fallback={`/teams/${teamId}`} />}>
        <Alert variant="warning">You must be on this team to add times.</Alert>
      </Page>
    );
  }

  if (!canSubmitOwnTime && !isCoach) {
    return (
      <Page title="Add time" actions={<BackButton fallback={`/teams/${teamId}`} />}>
        <Alert variant="info">
          You are not marked as a competing team member. Ask a coach to enable competing status on your roster entry.
        </Alert>
      </Page>
    );
  }

  if (isCoach && competingMembers.length === 0) {
    return (
      <Page title="Add time" actions={<BackButton fallback={`/teams/${teamId}/coach`} />}>
        <Alert variant="info">
          No competing team members yet. Add roster members with competing status enabled in Coach tools first.
        </Alert>
      </Page>
    );
  }

  return (
    <Page
      title="Add time"
      actions={<BackButton fallback={backFallback} />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <p className="form-page-intro mb-3">
          Enter a time in M:SS.mmm format. Coaches can submit for any competing member.
        </p>
        <Form onSubmit={handleSubmit} className="coach-tools-form">
          {isCoach && (
            <Form.Group>
              <Form.Label>Team member</Form.Label>
              <Form.Select
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                required
              >
                <option value="">Select team member</option>
                {competingMembers.map((membership) => (
                  <option key={membership.id} value={membership.user_id}>
                    {membership.username}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

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
            <Form.Label>{trackLabel}</Form.Label>
            <Form.Select value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
              <option value="">Select {trackLabel.toLowerCase()}</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.level_group_name ? `${level.level_group_name} — ${level.name}` : level.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Time</Form.Label>
            <Form.Control
              inputMode="decimal"
              placeholder="1:43.411"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              required
            />
            <Form.Text className="dashboard-panel-meta">Example: 1:43.411</Form.Text>
          </Form.Group>

          <Button type="submit" variant="outline-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save time'}
          </Button>
        </Form>
      </section>
    </Page>
  );
}
