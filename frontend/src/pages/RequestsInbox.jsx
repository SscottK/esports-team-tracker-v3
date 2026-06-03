import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useNav } from '../context/NavContext';
import * as orgApi from '../api/orgs';
import * as teamApi from '../api/teams';
import * as requestsApi from '../api/requests';

function requestTypeLabel(type) {
  if (type === 'org_join') return 'Organization join';
  if (type === 'team_join') return 'Team join';
  if (type === 'team_invite') return 'Team invite';
  if (type === 'team_migration') return 'Team move';
  if (type === 'password_reset') return 'Password reset';
  if (type === 'outgoing_team_migration') return 'Team move (outgoing)';
  if (type === 'incoming_team_migration') return 'Team move (incoming)';
  return type;
}

function statusBadge(status) {
  if (status === 'pending') return <Badge bg="warning" text="dark">Pending</Badge>;
  if (status === 'pending_source' || status === 'pending_target') {
    return <Badge bg="warning" text="dark">Pending</Badge>;
  }
  if (status === 'approved' || status === 'completed') {
    return <Badge bg="success">{status === 'completed' ? 'Completed' : 'Approved'}</Badge>;
  }
  if (status === 'rejected') return <Badge bg="danger">Rejected</Badge>;
  if (status === 'cancelled') return <Badge bg="secondary">Cancelled</Badge>;
  return <Badge bg="secondary">{status}</Badge>;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString();
}

function InboxList({
  items,
  emptyMessage,
  onReview,
  onRespond,
  onCancel,
  busy,
  showActions = false,
}) {
  if (items.length === 0) {
    return <p className="dashboard-empty-copy mb-0">{emptyMessage}</p>;
  }

  return (
    <div>
      {items.map((item) => (
        <div key={`${item.type}-${item.id}-${item.status}`} className="inbox-item-row">
          <div>
            <div className="inbox-item-title">
              <span>{item.title}</span>
              {statusBadge(item.status)}
              <Badge bg="secondary">{requestTypeLabel(item.type)}</Badge>
            </div>
            <div className="inbox-item-meta">{item.subtitle}</div>
            <div className="inbox-item-meta">{formatDate(item.created_at)}</div>
          </div>
          {showActions && item.action !== 'view' && (
            <div className="inbox-item-actions">
              {item.action === 'respond' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline-success"
                    className="team-member-history-btn"
                    disabled={busy}
                    onClick={() => onRespond(item, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    className="team-member-history-btn"
                    disabled={busy}
                    onClick={() => onRespond(item, 'decline')}
                  >
                    Decline
                  </Button>
                </>
              ) : item.action === 'cancel' ? (
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="team-member-history-btn"
                  disabled={busy}
                  onClick={() => onCancel(item)}
                >
                  Cancel
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline-success"
                    className="team-member-history-btn"
                    disabled={busy}
                    onClick={() => onReview(item, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    className="team-member-history-btn"
                    disabled={busy}
                    onClick={() => onReview(item, 'reject')}
                  >
                    Deny
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RequestsInbox() {
  const { refreshNav } = useNav();
  const [pending, setPending] = useState([]);
  const [reviewed, setReviewed] = useState([]);
  const [sent, setSent] = useState([]);
  const [view, setView] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const inbox = await requestsApi.getRequestInbox();
      setPending(inbox.pending || []);
      setReviewed(inbox.reviewed || []);
      setSent(inbox.sent || []);
    } catch {
      setError('Unable to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReview = async (item, action) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (item.type === 'org_join') {
        await orgApi.reviewOrgJoinRequest(item.org_id, item.id, { action });
      } else if (item.type === 'team_join') {
        await teamApi.reviewTeamJoinRequest(item.team_id, item.id, {
          action,
          is_competing_member: true,
        });
      } else if (item.type === 'outgoing_team_migration') {
        await orgApi.reviewOrgOutgoingTeamMigrationRequest(item.org_id, item.id, { action });
      } else if (item.type === 'incoming_team_migration') {
        await orgApi.reviewOrgTeamMigrationRequest(item.org_id, item.id, { action });
      }
      setSuccess(action === 'approve' ? 'Request approved.' : 'Request denied.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to review request.');
    } finally {
      setBusy(false);
    }
  };

  const handleRespond = async (item, action) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await teamApi.respondTeamInvite(item.team_id, item.id, action);
      setSuccess(action === 'accept' ? 'Invite accepted.' : 'Invite declined.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to respond to invite.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (item) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (item.type === 'org_join') {
        await orgApi.cancelOrgJoinRequest(item.org_id, item.id);
      } else if (item.type === 'team_join') {
        await teamApi.cancelTeamJoinRequest(item.team_id, item.id);
      } else if (item.type === 'team_invite') {
        await teamApi.respondTeamInvite(item.team_id, item.id, 'cancel');
      } else if (item.type === 'team_migration') {
        await teamApi.cancelTeamMigrationRequest(item.team_id, item.id);
      }
      setSuccess('Request cancelled.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to cancel request.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Page title="Requests"><p className="dashboard-loading">Loading...</p></Page>;
  }

  const pendingSentCount = sent.filter((item) => item.action === 'cancel').length;
  const activeItems = view === 'pending' ? pending : view === 'reviewed' ? reviewed : sent;
  const introCopy = {
    pending: 'Organization leaders see org and team move requests. Coaches see team join requests. Invites sent to you appear here too.',
    reviewed: 'Requests you have already approved, denied, accepted, or declined.',
    sent: 'Requests and invites you submitted. Cancel pending items here while you wait for a response.',
  };

  return (
    <Page
      title="Requests"
      actions={<BackButton fallback="/dashboard" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <div className="inbox-tabs" role="tablist" aria-label="Request lists">
          <Button
            type="button"
            role="tab"
            aria-selected={view === 'pending'}
            variant="outline-primary"
            className={`inbox-tab${view === 'pending' ? ' inbox-tab-active' : ''}`}
            onClick={() => setView('pending')}
          >
            Pending
            {pending.length > 0 && (
              <Badge bg="danger" className="inbox-tab-count">{pending.length}</Badge>
            )}
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={view === 'sent'}
            variant="outline-primary"
            className={`inbox-tab${view === 'sent' ? ' inbox-tab-active' : ''}`}
            onClick={() => setView('sent')}
          >
            Sent
            {pendingSentCount > 0 && (
              <Badge bg="secondary" className="inbox-tab-count">{pendingSentCount}</Badge>
            )}
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={view === 'reviewed'}
            variant="outline-primary"
            className={`inbox-tab${view === 'reviewed' ? ' inbox-tab-active' : ''}`}
            onClick={() => setView('reviewed')}
          >
            Reviewed
          </Button>
        </div>

        <p className="form-page-intro">{introCopy[view]}</p>

        <InboxList
          items={activeItems}
          emptyMessage={
            view === 'pending'
              ? 'No pending requests.'
              : view === 'sent'
                ? 'No sent requests yet.'
                : 'No reviewed requests yet.'
          }
          onReview={handleReview}
          onRespond={handleRespond}
          onCancel={handleCancel}
          busy={busy}
          showActions={view === 'pending' || view === 'sent'}
        />
      </section>
    </Page>
  );
}
