import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

function formatShortDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTrackLabel(entry) {
  return entry.level_group_name
    ? `${entry.level_group_name} · ${entry.level_name}`
    : entry.level_name;
}

export default function TimeHistory() {
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('user') || '';
  const initialGameId = searchParams.get('game') || '';

  const [teamName, setTeamName] = useState('');
  const [teamGames, setTeamGames] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [history, setHistory] = useState([]);
  const [gameId, setGameId] = useState(initialGameId);
  const [userId, setUserId] = useState(initialUserId);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isCoach = myMembership?.is_coach;
  const selectedMember = useMemo(
    () => memberships.find((membership) => String(membership.user_id) === String(userId)),
    [memberships, userId],
  );
  const pageTitle = useMemo(() => {
    if (!teamName) return 'Time history';
    if (selectedMember && (isCoach || selectedMember.user_id === myMembership?.user_id)) {
      return `${teamName} — ${selectedMember.username}`;
    }
    return `${teamName} — Time history`;
  }, [teamName, selectedMember, isCoach, myMembership]);

  useEffect(() => {
    Promise.all([
      teamApi.getTeam(teamId),
      teamApi.getTeamGames(teamId),
      teamApi.getTeamMembers(teamId),
    ]).then(([team, games, memberData]) => {
      setTeamName(team.name);
      setTeamGames(games);
      setMemberships(memberData.memberships);
      setMyMembership(memberData.my_membership);

      if (initialUserId) {
        setUserId(initialUserId);
      } else if (!memberData.my_membership?.is_coach) {
        setUserId(String(memberData.my_membership.user_id));
      }
    }).catch(() => {
      setError('Unable to load team data.');
      setLoading(false);
    });
  }, [teamId, initialUserId]);

  useEffect(() => {
    if (!myMembership) {
      return;
    }
    setLoading(true);
    setError('');
    const params = {};
    if (gameId) params.game_id = gameId;
    if (userId) params.user_id = userId;

    performancesApi.getTimeHistory(teamId, params)
      .then(setHistory)
      .catch(() => setError('Unable to load time history.'))
      .finally(() => setLoading(false));
  }, [teamId, gameId, userId, myMembership]);

  if (!myMembership) {
    return (
      <Page title="Time history" actions={<BackButton fallback={`/teams/${teamId}`} />}>
        <Alert variant="warning">You must be on this team to view time history.</Alert>
      </Page>
    );
  }

  return (
    <Page
      title={pageTitle}
      actions={<BackButton fallback={`/teams/${teamId}`} />}
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <Alert variant="info" className="dashboard-empty-alert mb-4">
        Times are stored <strong>per team</strong>. The grid shows each member&apos;s best time per track on this team.
      </Alert>

      <section className="esports-panel form-page-panel mb-4">
        <div className="history-filters">
          {isCoach && (
            <Form.Group>
              <Form.Label>Team member</Form.Label>
              <Form.Select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select a team member</option>
                {memberships.map((membership) => (
                  <option key={membership.id} value={membership.user_id}>
                    {membership.username}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
          <Form.Group>
            <Form.Label>Game</Form.Label>
            <Form.Select value={gameId} onChange={(e) => setGameId(e.target.value)}>
              <option value="">All games</option>
              {teamGames.map(({ game }) => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>
      </section>

      {loading ? (
        <p className="dashboard-loading">Loading history...</p>
      ) : !userId && isCoach ? (
        <Alert variant="info">Select a team member to view their submission history.</Alert>
      ) : history.length === 0 ? (
        <Alert variant="info">No time submissions yet for these filters.</Alert>
      ) : (
        <section className="esports-panel form-page-panel">
          <div className="history-list">
            {history.map((entry) => (
              <div key={entry.id} className="history-item-row">
                <div className="history-item-main">
                  <div className="history-item-title">
                    <span className="history-item-track">{formatTrackLabel(entry)}</span>
                    <span className="history-item-time">{entry.display_value}</span>
                  </div>
                  <div className="history-item-meta">
                    {formatShortDate(entry.created_at)}
                    {' · '}
                    Entered by {entry.entered_by_username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
