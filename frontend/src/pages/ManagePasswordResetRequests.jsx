import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import AdminReviewTabs from '../components/AdminReviewTabs';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import { requestStatusBadgeVariant, requestStatusLabel } from '../utils/inboxLabels';
import { djangoAdminUrl } from '../utils/djangoAdminLinks';
import * as adminApi from '../api/admin';

export default function ManagePasswordResetRequests() {
  const { user } = useAuth();
  const { refreshNav } = useNav();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('pending');
  const [pendingCount, setPendingCount] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, counts] = await Promise.all([
        adminApi.getPasswordResetRequests(view === 'reviewed'),
        adminApi.getAdminPendingCounts(),
      ]);
      setRequests(data);
      setPendingCount(counts.password_reset_requests || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load password reset requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_staff) {
      load();
    }
  }, [user, view]);

  const handleReview = async (requestId, action) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.reviewPasswordResetRequest(requestId, { action });
      setSuccess(action === 'complete' ? 'Request marked complete.' : 'Request rejected.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update request.');
    } finally {
      setBusy(false);
    }
  };

  if (!user?.is_staff) {
    return (
      <Page title="Password reset requests" actions={<BackButton fallback="/dashboard" />}>
        <Alert variant="warning">Platform admin access is required.</Alert>
      </Page>
    );
  }

  return (
    <Page
      title="Password reset requests"
      actions={<BackButton fallback="/dashboard" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <p className="form-page-intro mb-3">
          Users submit reset requests from the sign-in page. Open the linked Django admin user record to set a new
          password, then mark the request complete here.
        </p>

        <AdminReviewTabs
          view={view}
          onViewChange={setView}
          pendingCount={pendingCount}
          ariaLabel="Password reset request lists"
        />

        {loading ? (
          <p className="dashboard-loading mb-0">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="dashboard-empty-copy mb-0">
            {view === 'pending' ? 'No pending password reset requests.' : 'No reviewed password reset requests yet.'}
          </p>
        ) : (
          <div className="team-member-list">
            {requests.map((item) => {
              const statusVariant = requestStatusBadgeVariant(item.status);
              return (
                <div key={item.id} className="inbox-item-row">
                  <div>
                    <div className="inbox-item-title">
                      <span>{item.username}</span>
                      <Badge bg={statusVariant.bg} text={statusVariant.text}>
                        {requestStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <div className="inbox-item-meta">
                      Account email: {item.account_email || 'none on file'}
                    </div>
                    {item.contact_email && (
                      <div className="inbox-item-meta">Contact email: {item.contact_email}</div>
                    )}
                    {item.message && (
                      <div className="inbox-item-meta">{item.message}</div>
                    )}
                    <div className="inbox-item-meta">
                      Requested {new Date(item.created_at).toLocaleString()}
                    </div>
                    {item.django_admin_user_url && (
                      <div className="inbox-item-meta">
                        <a
                          href={djangoAdminUrl(item.django_admin_user_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open user in Django admin
                        </a>
                      </div>
                    )}
                  </div>
                  {view === 'pending' && item.status === 'pending' && (
                    <div className="inbox-item-actions">
                      <Button
                        size="sm"
                        variant="outline-success"
                        className="team-member-history-btn"
                        disabled={busy}
                        onClick={() => handleReview(item.id, 'complete')}
                      >
                        Mark complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="team-member-history-btn"
                        disabled={busy}
                        onClick={() => handleReview(item.id, 'reject')}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Page>
  );
}
