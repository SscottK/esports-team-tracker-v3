import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import * as orgApi from '../api/orgs';
import * as teamApi from '../api/teams';

export default function OrgLeaderTools() {
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
  const [teamName, setTeamName] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveMode, setLeaveMode] = useState('leave');
  const [successorMembershipId, setSuccessorMembershipId] = useState('');

  const otherOrgMembers = useMemo(
    () => orgMembers.filter((member) => member.user_id !== user?.id),
    [orgMembers, user],
  );
  const isOnlyOrgMember = org && otherOrgMembers.length === 0;

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

  useEffect(() => {
    if (!loading && org && !org.is_org_leader) {
      navigate(`/organizations/${orgId}`, { replace: true });
    }
  }, [loading, org, navigate, orgId]);

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const createdTeam = await teamApi.createTeam({ name: teamName, organization: org.id });
      setTeamName('');
      setSuccess('Team created. You are the head coach.');
      await Promise.all([load(), refreshNav()]);
      if (createdTeam?.id) {
        navigate(`/teams/${createdTeam.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.organization?.[0] || 'Unable to create team.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOrgLeader = async (membership) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await orgApi.updateOrgMember(org.id, membership.id, {
        is_org_leader: !membership.is_org_leader,
      });
      setSuccess('Organization leadership updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update org leadership.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerateJoinCode = async () => {
    setBusy(true);
    setError('');
    try {
      const code = await orgApi.regenerateJoinCode(org.id);
      setOrg((current) => ({ ...current, join_code: code }));
      setSuccess('Join code regenerated.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to regenerate join code.');
    } finally {
      setBusy(false);
    }
  };

  const openLeaveModal = () => {
    const canDisbandOnly = isOnlyOrgMember && orgTeamsList.length === 0;
    setLeaveMode(canDisbandOnly ? 'disband' : 'leave');
    setSuccessorMembershipId(otherOrgMembers[0]?.id ? String(otherOrgMembers[0].id) : '');
    setShowLeaveModal(true);
  };

  const handleLeaveOrg = async () => {
    if (leaveMode === 'leave' && !isOnlyOrgMember && !successorMembershipId) {
      setError('Choose a new organization leader before leaving.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload = leaveMode === 'disband'
        ? { disband: true }
        : !isOnlyOrgMember
          ? { successor_membership_id: Number(successorMembershipId) }
          : {};

      const result = await orgApi.leaveOrganization(org.id, payload);
      setShowLeaveModal(false);

      if (result.disbanded) {
        await refreshNav();
        navigate('/dashboard', { replace: true, state: { message: 'Organization disbanded.' } });
        return;
      }

      await refreshNav();
      navigate('/dashboard', {
        replace: true,
        state: {
          message: result.new_org_leader
            ? `You left ${org.name}. ${result.new_org_leader} is now organization leader.`
            : `You left ${org.name}.`,
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to leave organization.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Page title="Leader tools"><p>Loading...</p></Page>;
  }

  if (!org?.is_org_leader) {
    return null;
  }

  return (
    <Page
      title="Leader tools"
      actions={<BackButton fallback={`/organizations/${orgId}`} />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="leader-tools-bar esports-panel mb-4">
        <div className="leader-tools-bar-start">
          <span className="leader-tools-org-name">{org.name}</span>
          <Badge bg="primary">Org leader</Badge>
        </div>
        <div className="leader-tools-bar-end">
          <span className="leader-tools-join-label">Join code</span>
          {org.join_code && (
            <span className="org-join-code-display org-join-code-inline">{org.join_code}</span>
          )}
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleRegenerateJoinCode}
            disabled={busy}
          >
            Regenerate
          </Button>
        </div>
      </div>

      <div className="coach-tools-grid">
        <section className="esports-panel coach-tools-panel">
          <h3 className="coach-tools-section-title">Create team</h3>
          <p className="dashboard-panel-meta mb-3">
            New teams start with you as head coach.
          </p>
          <Form onSubmit={handleCreateTeam} className="coach-tools-form">
            <Form.Group>
              <Form.Label>Team name</Form.Label>
              <Form.Control
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="outline-primary" disabled={busy}>
              Create team
            </Button>
          </Form>
        </section>

        <section className="esports-panel coach-tools-panel">
          <h3 className="coach-tools-section-title">Members</h3>
          <p className="dashboard-panel-meta mb-3">
            {orgMembers.length} member{orgMembers.length === 1 ? '' : 's'} in this organization.
          </p>
          <div className="team-member-list">
            {orgMembers.map((member) => (
              <div key={member.id} className="team-member-row">
                <div className="team-member-identity">
                  <span className="team-member-name">{member.username}</span>
                  {member.is_org_leader && (
                    <Badge bg="secondary">Org leader</Badge>
                  )}
                  {member.user_id === user?.id && (
                    <Badge bg="info">You</Badge>
                  )}
                </div>
                {member.user_id !== user?.id && (
                  <Button
                    size="sm"
                    variant={member.is_org_leader ? 'outline-danger' : 'outline-primary'}
                    className="team-member-history-btn"
                    disabled={busy}
                    onClick={() => handleToggleOrgLeader(member)}
                  >
                    {member.is_org_leader ? 'Remove leader' : 'Make leader'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="esports-panel coach-tools-panel coach-tools-panel-danger mt-4">
        <h3 className="coach-tools-section-title">Leave organization</h3>
        <p className="dashboard-panel-meta mb-3">
          Assign a new leader or disband the organization. Disband all teams first if any still exist.
        </p>
        {isOnlyOrgMember && orgTeamsList.length > 0 && (
          <Alert variant="info" className="small py-2 mb-3">
            Disband your teams before you can leave or disband this organization.
          </Alert>
        )}
        <Button
          variant="outline-danger"
          onClick={openLeaveModal}
          disabled={busy || (isOnlyOrgMember && orgTeamsList.length > 0)}
        >
          {isOnlyOrgMember && orgTeamsList.length === 0
            ? 'Disband organization'
            : 'Leave organization'}
        </Button>
      </section>

      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {leaveMode === 'disband' ? 'Disband organization' : 'Leave organization'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!isOnlyOrgMember && (
            <Form.Group className="mb-3">
              <Form.Label>What would you like to do?</Form.Label>
              <Form.Select
                value={leaveMode}
                onChange={(e) => setLeaveMode(e.target.value)}
                disabled={orgTeamsList.length > 0}
              >
                <option value="leave">Assign a new organization leader and leave</option>
                <option value="disband">Disband the entire organization</option>
              </Form.Select>
            </Form.Group>
          )}

          {orgTeamsList.length > 0 && leaveMode === 'disband' && (
            <Alert variant="warning">
              Disband all teams in this organization before disbanding the organization.
            </Alert>
          )}

          {leaveMode === 'leave' && !isOnlyOrgMember && (
            <Form.Group className="mb-3">
              <Form.Label>New organization leader</Form.Label>
              <Form.Select
                value={successorMembershipId}
                onChange={(e) => setSuccessorMembershipId(e.target.value)}
              >
                <option value="">Select an org member</option>
                {otherOrgMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username}
                    {member.is_org_leader ? ' (already a leader)' : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          {leaveMode === 'disband' && orgTeamsList.length === 0 ? (
            <Alert variant="warning" className="mb-0">
              This permanently deletes the organization and its join code.
            </Alert>
          ) : leaveMode === 'leave' ? (
            <p className="mb-0 dashboard-panel-meta">
              You will be removed from every team in this organization.
            </p>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowLeaveModal(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="outline-danger"
            onClick={handleLeaveOrg}
            disabled={
              busy
              || (leaveMode === 'disband' && orgTeamsList.length > 0)
              || (leaveMode === 'leave' && !isOnlyOrgMember && !successorMembershipId)
            }
          >
            {leaveMode === 'disband' ? 'Disband organization' : 'Leave organization'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Page>
  );
}
