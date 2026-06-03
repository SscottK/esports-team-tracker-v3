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
  if (type === 'outgoing_team_migration') return 'Team move (outgoing)';
  if (type === 'incoming_team_migration') return 'Team move (incoming)';
  return type;
}

function statusBadge(status) {
  if (status === 'pending') return <Badge bg="warning" text="dark">Pending</Badge>;
  if (status === 'approved') return <Badge bg="success">Approved</Badge>;
  if (status === 'rejected') return <Badge bg="danger">Rejected</Badge>;
  return <Badge bg="secondary">{status}</Badge>;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString();
}

function InboxList({ items, emptyMessage, onReview, busy, showActions = false }) {
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
          {showActions && (
            <div className="inbox-item-actions">
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

  if (loading) {
    return <Page title="Requests"><p className="dashboard-loading">Loading...</p></Page>;
  }

  const isPendingView = view === 'pending';
  const activeItems = isPendingView ? pending : reviewed;

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
            aria-selected={isPendingView}
            variant="outline-primary"
            className={`inbox-tab${isPendingView ? ' inbox-tab-active' : ''}`}
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
            aria-selected={!isPendingView}
            variant="outline-primary"
            className={`inbox-tab${!isPendingView ? ' inbox-tab-active' : ''}`}
            onClick={() => setView('reviewed')}
          >
            Reviewed
          </Button>
        </div>

        <p className="form-page-intro">
          {isPendingView
            ? 'Organization leaders see org and team move requests. Coaches see team join requests.'
            : 'Requests you have already approved or denied.'}
        </p>

        <InboxList
          items={activeItems}
          emptyMessage={isPendingView ? 'No pending requests.' : 'No reviewed requests yet.'}
          onReview={handleReview}
          busy={busy}
          showActions={isPendingView}
        />
      </section>
    </Page>
  );
}
