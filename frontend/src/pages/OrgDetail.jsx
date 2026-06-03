import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import * as orgApi from '../api/orgs';
import * as teamApi from '../api/teams';

export default function OrgDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshNav } = useNav();
  const [org, setOrg] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [orgTeamsList, setOrgTeamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const orgLeaders = useMemo(
    () => orgMembers.filter((member) => member.is_org_leader),
    [orgMembers],
  );
  const joinableTeams = useMemo(
    () => orgTeamsList.filter((team) => !team.is_member),
    [orgTeamsList],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const orgList = await orgApi.getMyOrganizations();
      const currentOrg = orgList.find((entry) => entry.id === Number(orgId));
      if (!currentOrg) {
        setOrg(null);
        return;
      }
      setOrg(currentOrg);

      const [members, orgTeamsData] = await Promise.all([
        orgApi.getOrgMembers(orgId),
        teamApi.getOrgTeams(orgId),
      ]);
      setOrgMembers(members);
      setOrgTeamsList(orgTeamsData);
    } catch {
      setError('Unable to load organization.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleRequestTeamJoin = async (teamId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await teamApi.requestTeamJoin(teamId);
      setSuccess('Join request sent to the team coaches.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request team join.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTeamJoinRequest = async (teamId, requestId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await teamApi.cancelTeamJoinRequest(teamId, requestId);
      setSuccess('Join request cancelled.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to cancel join request.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveOrg = async () => {
    setBusy(true);
    setError('');
    try {
      await orgApi.leaveOrganization(org.id, {});
      await refreshNav();
      navigate('/dashboard', {
        replace: true,
        state: { message: `You left ${org.name}.` },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to leave organization.');
    } finally {
      setBusy(false);
      setShowLeaveModal(false);
    }
  };

  if (loading) {
    return <Page title="Organization"><p>Loading...</p></Page>;
  }

  if (!org) {
    return (
      <Page title="Organization">
        <Alert variant="warning">Organization not found or you are not a member.</Alert>
        <BackButton fallback="/dashboard" label="Back to dashboard" />
      </Page>
    );
  }

  return (
    <Page
      title={org.name}
      actions={(
        <div className="page-header-actions">
          {org.is_org_leader && (
            <Button as={Link} to={`/organizations/${orgId}/leader`} variant="outline-primary" size="sm">
              Leader tools
            </Button>
          )}
          <BackButton fallback="/dashboard" />
        </div>
      )}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="team-detail-meta esports-panel mb-4">
        <div className="team-detail-meta-main">
          <Badge bg={org.is_org_leader ? 'primary' : 'secondary'} className="team-detail-org-badge">
            {org.is_org_leader ? 'Org leader' : 'Member'}
          </Badge>
          <span className="team-detail-role">
            {orgMembers.length} member{orgMembers.length === 1 ? '' : 's'}
            {' · '}
            {orgTeamsList.length} team{orgTeamsList.length === 1 ? '' : 's'}
          </span>
        </div>
        {org.is_org_leader && (
          <span className="team-detail-meta-hint">
            Join code and admin actions are in Leader tools
          </span>
        )}
      </div>

      <div className="team-detail-grid">
        <section className="esports-panel team-detail-panel team-detail-panel-games">
          <div className="team-detail-section-head">
            <h3 className="dashboard-panel-title">Teams</h3>
            <p className="dashboard-panel-meta">Open a team to view roster and times</p>
          </div>
          {orgTeamsList.length === 0 ? (
            <p className="dashboard-empty-copy mb-0">
              {org.is_org_leader
                ? 'No teams yet. Create one in Leader tools.'
                : 'No teams in this organization yet.'}
            </p>
          ) : (
            <div className="team-games-list">
              {orgTeamsList.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="team-game-link"
                >
                  {team.name}
                  {team.is_member && (
                    <Badge bg="info" className="ms-2 org-team-member-badge">Member</Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="esports-panel team-detail-panel team-detail-panel-roster">
          <div className="team-detail-section-head team-detail-section-head-left">
            <h3 className="dashboard-panel-title">Leaders</h3>
            <p className="dashboard-panel-meta">
              {orgLeaders.length} org leader{orgLeaders.length === 1 ? '' : 's'}
            </p>
          </div>
          {orgLeaders.length === 0 ? (
            <p className="dashboard-empty-copy mb-0">No organization leaders assigned.</p>
          ) : (
            <div className="team-member-list">
              {orgLeaders.map((member) => (
                <div key={member.id} className="team-member-row">
                  <div className="team-member-identity">
                    <span className="team-member-name">{member.username}</span>
                    {member.user_id === user?.id && (
                      <Badge bg="info">You</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
      </div>

      {joinableTeams.length > 0 && (
        <section className="esports-panel team-detail-panel mt-4">
          <div className="team-detail-section-head team-detail-section-head-left">
            <h3 className="dashboard-panel-title">Join a team</h3>
            <p className="dashboard-panel-meta">Coaches review requests before you are added</p>
          </div>
          <div className="team-member-list">
            {joinableTeams.map((team) => (
              <div key={team.id} className="team-member-row">
                <div className="team-member-identity">
                  <span className="team-member-name">{team.name}</span>
                </div>
                <div className="team-member-actions">
                  {team.pending_join_request_id ? (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="team-member-history-btn"
                      disabled={busy}
                      onClick={() => handleCancelTeamJoinRequest(
                        team.id,
                        team.pending_join_request_id,
                      )}
                    >
                      Cancel request
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="team-member-history-btn"
                      disabled={busy}
                      onClick={() => handleRequestTeamJoin(team.id)}
                    >
                      Request to join
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!org.is_org_leader && (
        <section className="esports-panel team-detail-panel team-detail-danger mt-4">
          <h3 className="dashboard-panel-title mb-2">Leave organization</h3>
          <p className="dashboard-panel-meta mb-3">
            You will be removed from all teams in this organization.
          </p>
          <Button variant="outline-danger" onClick={() => setShowLeaveModal(true)} disabled={busy}>
            Leave organization
          </Button>
        </section>
      )}

      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave organization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 dashboard-panel-meta">
            You will be removed from {org.name} and all of its teams.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowLeaveModal(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="outline-danger" onClick={handleLeaveOrg} disabled={busy}>
            Leave organization
          </Button>
        </Modal.Footer>
      </Modal>
    </Page>
  );
}
