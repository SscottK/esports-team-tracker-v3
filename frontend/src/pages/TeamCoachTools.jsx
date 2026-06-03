import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { migrationStatusLabel, roleLabel } from '../utils/teamMembership';
import { TEAM_COLOR_THEME_OPTIONS, normalizeTeamColorTheme } from '../utils/teamThemes';
import { useNav } from '../context/NavContext';
import * as gamesApi from '../api/games';
import * as teamApi from '../api/teams';

export default function TeamCoachTools() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { refreshNav } = useNav();
  const [team, setTeam] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [catalogGames, setCatalogGames] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [migrationRequests, setMigrationRequests] = useState([]);
  const [migrationJoinCode, setMigrationJoinCode] = useState('');
  const [myMembership, setMyMembership] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [username, setUsername] = useState('');
  const [newCoachRole, setNewCoachRole] = useState('none');
  const [newCompeting, setNewCompeting] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveMode, setLeaveMode] = useState('leave');
  const [successorMembershipId, setSuccessorMembershipId] = useState('');

  const isHeadCoach = myMembership?.is_head_coach;
  const otherMembers = useMemo(
    () => memberships.filter((membership) => membership.user_id !== myMembership?.user_id),
    [memberships, myMembership],
  );
  const isOnlyMember = myMembership && otherMembers.length === 0;
  const defaultUploadGameId = teamGames[0]?.game?.id;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamData, games, catalog, memberData, pendingMigrations] = await Promise.all([
        teamApi.getTeam(teamId),
        teamApi.getTeamGames(teamId),
        gamesApi.getCatalogGames(),
        teamApi.getTeamMembers(teamId),
        teamApi.getTeamMigrationRequests(teamId).catch(() => []),
      ]);
      setTeam(teamData);
      setTeamGames(games);
      setCatalogGames(catalog);
      setMemberships(memberData.memberships);
      setMyMembership(memberData.my_membership);
      setMigrationRequests(Array.isArray(pendingMigrations) ? pendingMigrations : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load team.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [teamId]);

  useEffect(() => {
    if (!loading && myMembership && !myMembership.is_coach) {
      navigate(`/teams/${teamId}`, { replace: true });
    }
  }, [loading, myMembership, navigate, teamId]);

  const handleThemeChange = async (colorTheme) => {
    if (normalizeTeamColorTheme(team?.color_theme) === colorTheme) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await teamApi.updateTeamTheme(teamId, colorTheme);
      setTeam(updated);
      await refreshNav();
      setSuccess('Team colors updated.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update team colors.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddGame = async (event) => {
    event.preventDefault();
    if (!selectedGameId) return;
    setBusy(true);
    setSuccess('');
    setError('');
    try {
      await teamApi.addTeamGame(teamId, selectedGameId);
      setSelectedGameId('');
      setSuccess('Game assigned.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to add game.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setBusy(true);
    setSuccess('');
    setError('');
    try {
      await teamApi.addTeamMember(teamId, {
        username,
        coach_role: newCoachRole,
        is_competing_member: newCompeting,
      });
      setUsername('');
      setSuccess('Roster entry saved.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to add team member.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestTeamMigration = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const migrationRequest = await teamApi.requestTeamMigration(teamId, migrationJoinCode);
      setMigrationJoinCode('');
      setSuccess(`Move request sent to ${migrationRequest.target_organization_name}. Both org leaders must approve.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request team move.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTeamMigration = async (requestId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await teamApi.cancelTeamMigrationRequest(teamId, requestId);
      setSuccess('Move request cancelled.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to cancel move request.');
    } finally {
      setBusy(false);
    }
  };

  const openLeaveModal = () => {
    setLeaveMode(isOnlyMember ? 'disband' : 'leave');
    setSuccessorMembershipId(otherMembers[0]?.id ? String(otherMembers[0].id) : '');
    setShowLeaveModal(true);
  };

  const handleLeaveTeam = async () => {
    if (isHeadCoach && leaveMode === 'leave' && !isOnlyMember && !successorMembershipId) {
      setError('Choose a new head coach before leaving.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload = leaveMode === 'disband'
        ? { disband: true }
        : isHeadCoach
          ? { successor_membership_id: Number(successorMembershipId) }
          : {};

      const result = await teamApi.leaveTeam(teamId, payload);
      if (result.disbanded) {
        navigate('/dashboard', { replace: true, state: { message: 'Team disbanded.' } });
        return;
      }
      navigate('/dashboard', {
        replace: true,
        state: {
          message: result.new_head_coach
            ? `You left the team. ${result.new_head_coach} is now head coach.`
            : 'You left the team.',
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to leave team.');
    } finally {
      setBusy(false);
      setShowLeaveModal(false);
    }
  };

  if (loading) {
    return <Page title="Coach tools"><p>Loading...</p></Page>;
  }

  if (!myMembership?.is_coach) {
    return null;
  }

  const uploadTimesPath = defaultUploadGameId
    ? `/teams/${teamId}/upload-times?game=${defaultUploadGameId}`
    : `/teams/${teamId}/upload-times`;

  return (
    <Page
      title="Coach tools"
      actions={(
        <div className="page-header-actions">
          <Button as={Link} to={`/teams/${teamId}/benchmarks`} variant="outline-primary" size="sm">
            Set benchmarks
          </Button>
          <Button as={Link} to={`/teams/${teamId}/time-history`} variant="outline-primary" size="sm">
            Member histories
          </Button>
          <Button
            as={Link}
            to={`/teams/${teamId}/time-history?user=${myMembership.user_id}`}
            variant="outline-primary"
            size="sm"
          >
            My history
          </Button>
          <Button as={Link} to={`/teams/${teamId}/add-time`} variant="outline-primary" size="sm">
            Add time
          </Button>
          <Button as={Link} to={uploadTimesPath} variant="outline-primary" size="sm">
            Upload CSV
          </Button>
          <BackButton fallback={`/teams/${teamId}`} />
        </div>
      )}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="leader-tools-bar esports-panel mb-4">
        <div className="leader-tools-bar-start">
          <span className="leader-tools-org-name">{team?.name}</span>
          {team?.organization_name && (
            <Badge bg="secondary">{team.organization_name}</Badge>
          )}
        </div>
        <div className="leader-tools-bar-end">
          <span className="leader-tools-join-label">Your role</span>
          <span className="team-detail-role">
            <strong>{roleLabel(myMembership)}</strong>
          </span>
        </div>
      </div>

      {isHeadCoach && (
        <section className="esports-panel coach-tools-panel mb-4">
          <h3 className="coach-tools-section-title">Team colors</h3>
          <p className="dashboard-panel-meta mb-3">
            Pick an accent palette. Team members see these colors across the app while viewing this team.
          </p>
          <div className="team-theme-picker">
            {TEAM_COLOR_THEME_OPTIONS.map((theme) => {
              const isSelected = normalizeTeamColorTheme(team?.color_theme) === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`team-theme-option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleThemeChange(theme.id)}
                  disabled={busy}
                  aria-pressed={isSelected}
                >
                  <span
                    className="team-theme-swatch"
                    style={{ backgroundColor: theme.accent }}
                    aria-hidden="true"
                  />
                  <span className="team-theme-label">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="coach-tools-grid">
        <section className="esports-panel coach-tools-panel">
          <h3 className="coach-tools-section-title">Roster</h3>
          <p className="dashboard-panel-meta mb-3">
            Add a user by username or update an existing member’s role and competing status.
          </p>
          <Form onSubmit={handleAddMember} className="coach-tools-form">
            <Form.Group>
              <Form.Label>Username</Form.Label>
              <Form.Control
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>
            {isHeadCoach && (
              <Form.Group>
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={newCoachRole}
                  onChange={(e) => setNewCoachRole(e.target.value)}
                >
                  <option value="none">Team member</option>
                  <option value="assistant">Assistant coach</option>
                  <option value="head">Head coach</option>
                </Form.Select>
              </Form.Group>
            )}
            <Form.Check
              type="switch"
              label="Competing member (shows in times grid)"
              checked={newCompeting}
              onChange={(e) => setNewCompeting(e.target.checked)}
            />
            <Button type="submit" variant="outline-primary" disabled={busy}>
              Save roster entry
            </Button>
          </Form>
        </section>

        <section className="esports-panel coach-tools-panel">
          <h3 className="coach-tools-section-title">Games</h3>
          <p className="dashboard-panel-meta mb-3">
            Assign a catalog game to this team. Roster edits on the team page update roles inline.
          </p>
          {teamGames.length > 0 && (
            <ul className="coach-tools-game-list mb-3">
              {teamGames.map(({ game }) => (
                <li key={game.id}>
                  <Link to={`/teams/${teamId}/games/${game.id}`}>{game.name}</Link>
                </li>
              ))}
            </ul>
          )}
          <Form onSubmit={handleAddGame} className="coach-tools-form">
            <Form.Group>
              <Form.Label>Assign game</Form.Label>
              <Form.Select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                required
              >
                <option value="">Select a game</option>
                {catalogGames.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button type="submit" variant="outline-primary" disabled={busy}>
              Assign game
            </Button>
          </Form>
        </section>
      </div>

      {isHeadCoach && (
        <section className="esports-panel coach-tools-panel mt-4">
          <h3 className="coach-tools-section-title">Move organization</h3>
          <p className="dashboard-panel-meta mb-3">
            Enter a target org join code. Both org leaders must approve before the team moves.
          </p>
          {migrationRequests.length > 0 ? (
            <div className="team-member-list">
              {migrationRequests.map((migrationRequest) => (
                <div key={migrationRequest.id} className="team-member-row">
                  <div>
                    <strong>{migrationRequest.target_organization_name}</strong>
                    <div className="dashboard-panel-meta">
                      {migrationStatusLabel(migrationRequest.status)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={busy}
                    onClick={() => handleCancelTeamMigration(migrationRequest.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Form onSubmit={handleRequestTeamMigration} className="coach-tools-inline-form">
              <Form.Control
                placeholder="Target org join code"
                value={migrationJoinCode}
                onChange={(e) => setMigrationJoinCode(e.target.value.toUpperCase())}
                required
              />
              <Button type="submit" variant="outline-primary" disabled={busy}>
                Request move
              </Button>
            </Form>
          )}
        </section>
      )}

      <section className="esports-panel coach-tools-panel coach-tools-panel-danger mt-4">
        <h3 className="coach-tools-section-title">Leave team</h3>
        <p className="dashboard-panel-meta mb-3">
          {isHeadCoach
            ? 'Assign a new head coach or disband the team before leaving.'
            : 'You will lose access to this team’s roster, games, and times.'}
        </p>
        <Button variant="outline-danger" onClick={openLeaveModal} disabled={busy}>
          {isHeadCoach && isOnlyMember ? 'Disband team' : 'Leave team'}
        </Button>
      </section>

      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {leaveMode === 'disband' ? 'Disband team' : 'Leave team'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isHeadCoach && !isOnlyMember && (
            <Form.Group className="mb-3">
              <Form.Label>What would you like to do?</Form.Label>
              <Form.Select
                value={leaveMode}
                onChange={(e) => setLeaveMode(e.target.value)}
              >
                <option value="leave">Assign a new head coach and leave</option>
                <option value="disband">Disband the entire team</option>
              </Form.Select>
            </Form.Group>
          )}

          {isHeadCoach && leaveMode === 'leave' && !isOnlyMember && (
            <Form.Group className="mb-3">
              <Form.Label>New head coach</Form.Label>
              <Form.Select
                value={successorMembershipId}
                onChange={(e) => setSuccessorMembershipId(e.target.value)}
              >
                <option value="">Select a team member</option>
                {otherMembers.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {membership.username} ({roleLabel(membership)})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          {leaveMode === 'disband' || isOnlyMember ? (
            <Alert variant="warning" className="mb-0">
              This permanently deletes the team, roster, assigned games, benchmarks, and all recorded times.
            </Alert>
          ) : (
            <p className="mb-0 dashboard-panel-meta">
              You will be removed from this team after the new head coach is assigned.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowLeaveModal(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="outline-danger"
            onClick={handleLeaveTeam}
            disabled={busy || (isHeadCoach && leaveMode === 'leave' && !isOnlyMember && !successorMembershipId)}
          >
            {leaveMode === 'disband' || isOnlyMember ? 'Disband team' : 'Leave team'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Page>
  );
}
