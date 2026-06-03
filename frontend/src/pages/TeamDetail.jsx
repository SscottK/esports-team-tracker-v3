import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { roleLabel } from '../utils/teamMembership';
import * as teamApi from '../api/teams';

const COACH_ROLE_ORDER = { head: 0, assistant: 1, none: 2 };

function roleBadges(membership) {
  const badges = [];
  if (membership.coach_role === 'head') {
    badges.push({ key: 'head', label: 'Head coach' });
  } else if (membership.coach_role === 'assistant') {
    badges.push({ key: 'assistant', label: 'Assistant coach' });
  }
  if (membership.is_competing_member) {
    badges.push({ key: 'competes', label: 'Competes' });
  }
  if (badges.length === 0) {
    badges.push({ key: 'member', label: 'Member' });
  }
  return badges;
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const isCoach = myMembership?.is_coach;
  const isHeadCoach = myMembership?.is_head_coach;
  const sortedMembers = useMemo(
    () => [...memberships].sort((a, b) => {
      const roleDiff = (COACH_ROLE_ORDER[a.coach_role] ?? 2) - (COACH_ROLE_ORDER[b.coach_role] ?? 2);
      if (roleDiff !== 0) return roleDiff;
      return a.username.localeCompare(b.username);
    }),
    [memberships],
  );

  const load = async () => {
    if (!teamId || teamId === 'undefined') {
      setLoading(false);
      setTeam(null);
      setTeamGames([]);
      setMemberships([]);
      setMyMembership(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [teamData, games, memberData] = await Promise.all([
        teamApi.getTeam(teamId),
        teamApi.getTeamGames(teamId),
        teamApi.getTeamMembers(teamId),
      ]);
      setTeam(teamData);
      setTeamGames(games);
      setMemberships(memberData.memberships ?? []);
      setMyMembership(memberData.my_membership);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('Team not found or you do not have access.');
      } else if (status === 403) {
        setError('You do not have access to this team.');
      } else {
        setError(err.response?.data?.detail || 'Unable to load team.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [teamId]);

  const handleMembershipUpdate = async (membershipId, payload) => {
    setBusy(true);
    setError('');
    try {
      await teamApi.updateTeamMember(teamId, membershipId, payload);
      setSuccess('Roster updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update roster.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveTeam = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await teamApi.leaveTeam(teamId, {});
      navigate('/dashboard', { replace: true, state: { message: 'You left the team.' } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to leave team.');
    } finally {
      setBusy(false);
      setShowLeaveModal(false);
    }
  };

  if (loading) {
    return <Page title="Team"><p>Loading...</p></Page>;
  }

  if (!teamId || teamId === 'undefined') {
    return (
      <Page title="Team" actions={<BackButton fallback="/dashboard" />}>
        <Alert variant="warning" className="mb-0">
          This team link is invalid. Go back to the dashboard or open a team from the menu.
        </Alert>
      </Page>
    );
  }

  if (error && !team) {
    return (
      <Page title="Team" actions={<BackButton fallback="/dashboard" />}>
        <Alert variant="warning" className="mb-0">{error}</Alert>
      </Page>
    );
  }

  return (
    <Page
      title={team?.name || 'Team'}
      actions={(
        <div className="page-header-actions">
          {isCoach && (
            <Button as={Link} to={`/teams/${teamId}/coach`} variant="outline-primary" size="sm">
              Coach tools
            </Button>
          )}
          <BackButton fallback="/dashboard" />
        </div>
      )}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {myMembership && (
        <div className="team-detail-meta esports-panel mb-4">
          <div className="team-detail-meta-main">
            {team?.organization_name && (
              <Badge bg="secondary" className="team-detail-org-badge">
                {team.organization_name}
              </Badge>
            )}
            <span className="team-detail-role">
              You are a <strong>{roleLabel(myMembership)}</strong>
            </span>
          </div>
          {isCoach && !myMembership.is_competing_member && (
            <span className="team-detail-meta-hint">
              Mark yourself as competing in Coach tools to appear on the times grid
            </span>
          )}
        </div>
      )}

      <div className="team-detail-grid">
        <section className="esports-panel team-detail-panel team-detail-panel-games">
          <div className="team-detail-section-head">
            <h3 className="dashboard-panel-title">Games</h3>
            <p className="dashboard-panel-meta">Open a game to view the team times grid</p>
          </div>
          {teamGames.length === 0 ? (
            <p className="dashboard-empty-copy mb-0">
              {isCoach ? 'No games assigned yet. Assign one in Coach tools.' : 'No games assigned yet.'}
            </p>
          ) : (
            <div className="team-games-list">
              {teamGames.map(({ id, game }) => (
                <Link
                  key={id}
                  to={`/teams/${teamId}/games/${game.id}`}
                  className="team-game-link"
                >
                  {game.name}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="esports-panel team-detail-panel team-detail-panel-roster">
          <div className="team-detail-section-head team-detail-section-head-left">
            <h3 className="dashboard-panel-title">Team</h3>
            <p className="dashboard-panel-meta">
              {sortedMembers.length} member{sortedMembers.length === 1 ? '' : 's'}
            </p>
          </div>
          {sortedMembers.length === 0 ? (
            <p className="dashboard-empty-copy mb-0">No members yet.</p>
          ) : (
            <div className="team-member-list">
              {sortedMembers.map((membership) => {
                const showCompeteToggle = isHeadCoach;
                const visibleBadges = roleBadges(membership).filter(
                  (badge) => !(showCompeteToggle && badge.key === 'competes'),
                );

                return (
                  <div key={membership.id} className="team-member-row">
                    <div className="team-member-identity">
                      <span className="team-member-name">{membership.username}</span>
                      {visibleBadges.length > 0 && (
                        <span className="team-member-badges">
                          {visibleBadges.map((badge) => (
                            <Badge
                              key={badge.key}
                              bg={badge.key === 'competes' ? 'info' : 'secondary'}
                            >
                              {badge.label}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="team-member-actions">
                      <Button
                        as={Link}
                        to={`/teams/${teamId}/time-history?user=${membership.user_id}`}
                        size="sm"
                        variant="outline-primary"
                        className="team-member-history-btn"
                      >
                        History
                      </Button>
                      {isHeadCoach && membership.user_id !== myMembership?.user_id && (
                        <Form.Select
                          size="sm"
                          className="team-member-role-select"
                          value={membership.coach_role}
                          onChange={(e) => handleMembershipUpdate(membership.id, {
                            coach_role: e.target.value,
                          })}
                        >
                          <option value="none">Member</option>
                          <option value="assistant">Assistant</option>
                          <option value="head">Head coach</option>
                        </Form.Select>
                      )}
                      {isHeadCoach && (
                        <Form.Check
                          type="switch"
                          label="Competes"
                          className="team-member-compete-switch"
                          checked={membership.is_competing_member}
                          onChange={(e) => handleMembershipUpdate(membership.id, {
                            is_competing_member: e.target.checked,
                          })}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {myMembership && !isCoach && (
        <section className="esports-panel team-detail-panel team-detail-danger mt-4">
          <h3 className="dashboard-panel-title mb-2">Leave team</h3>
          <p className="dashboard-panel-meta mb-3">
            You will lose access to this team’s roster, games, and times.
          </p>
          <Button variant="outline-danger" onClick={() => setShowLeaveModal(true)} disabled={busy}>
            Leave team
          </Button>
        </section>
      )}

      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave team</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 dashboard-panel-meta">
            You will be removed from {team?.name}. This cannot be undone from your account.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowLeaveModal(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="outline-danger" onClick={handleLeaveTeam} disabled={busy}>
            Leave team
          </Button>
        </Modal.Footer>
      </Modal>
    </Page>
  );
}
