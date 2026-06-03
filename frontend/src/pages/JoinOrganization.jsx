import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useNav } from '../context/NavContext';
import * as orgApi from '../api/orgs';

export default function JoinOrganization() {
  const { refreshNav } = useNav();
  const [myOrgJoinRequests, setMyOrgJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orgName, setOrgName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const pendingMyOrgRequests = await orgApi.getMyOrgJoinRequests();
      setMyOrgJoinRequests(pendingMyOrgRequests);
    } catch {
      setError('Unable to load organization requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateOrg = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await orgApi.createOrganization(orgName);
      setOrgName('');
      setSuccess('Organization created. You are the organization leader.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to create organization.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestOrgJoin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const joinRequest = await orgApi.requestOrgJoin(joinCode);
      setJoinCode('');
      setSuccess(`Join request sent to ${joinRequest.organization_name}. An org leader must approve it.`);
      await load();
    } catch (err) {
      setError(
        err.response?.data?.detail || err.response?.data?.code?.[0] || 'Unable to request organization join.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancelOrgJoinRequest = async (orgId, requestId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await orgApi.reviewOrgJoinRequest(orgId, requestId, { action: 'cancel' });
      setSuccess('Organization join request cancelled.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to cancel join request.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Page title="Create or join organization"><p className="dashboard-loading">Loading...</p></Page>;
  }

  return (
    <Page
      title="Create or join organization"
      actions={<BackButton fallback="/dashboard" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel mb-4">
        <p className="form-page-intro">
          You can belong to multiple organizations — for example, one you lead and another where you are a team member.
        </p>
        <div className="form-page-grid">
          <Form onSubmit={handleCreateOrg} className="coach-tools-form">
            <Form.Group>
              <Form.Label>Create organization</Form.Label>
              <Form.Control
                placeholder="Organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="outline-primary" disabled={busy}>Create</Button>
          </Form>

          <Form onSubmit={handleRequestOrgJoin} className="coach-tools-form">
            <Form.Group>
              <Form.Label>Request to join with code</Form.Label>
              <Form.Control
                placeholder="Join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
              />
            </Form.Group>
            <Button type="submit" variant="outline-primary" disabled={busy}>Send request</Button>
          </Form>
        </div>
      </section>

      {myOrgJoinRequests.length > 0 && (
        <section className="esports-panel form-page-panel">
          <h3 className="coach-tools-section-title">Pending requests</h3>
          <div className="team-member-list">
            {myOrgJoinRequests.map((joinRequest) => (
              <div
                key={joinRequest.id}
                className="team-member-row"
              >
                <div className="team-member-identity">
                  <span className="team-member-name">{joinRequest.organization_name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline-primary"
                  className="team-member-history-btn"
                  disabled={busy}
                  onClick={() => handleCancelOrgJoinRequest(
                    joinRequest.organization,
                    joinRequest.id,
                  )}
                >
                  Cancel request
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
