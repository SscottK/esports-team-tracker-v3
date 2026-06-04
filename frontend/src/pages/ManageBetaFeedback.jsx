import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import AdminReviewTabs from '../components/AdminReviewTabs';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import * as adminApi from '../api/admin';

function formatWhen(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

export default function ManageBetaFeedback() {
  const { user } = useAuth();
  const { refreshNav } = useNav();
  const [items, setItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('pending');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, counts] = await Promise.all([
        adminApi.getBetaFeedback(view === 'reviewed'),
        adminApi.getAdminPendingCounts(),
      ]);
      setItems(data);
      setPendingCount(counts.beta_feedback || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load beta feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_staff) {
      load();
    }
  }, [user, view]);

  const handleReview = async (feedbackId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.reviewBetaFeedback(feedbackId);
      setSuccess('Feedback marked reviewed.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to mark feedback reviewed.');
    } finally {
      setBusy(false);
    }
  };

  if (!user?.is_staff) {
    return (
      <Page title="Beta feedback" actions={<BackButton fallback="/dashboard" />}>
        <Alert variant="warning">Platform admin access is required.</Alert>
      </Page>
    );
  }

  return (
    <Page title="Beta feedback" actions={<BackButton fallback="/dashboard" />}>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <p className="form-page-intro mb-3">
          Review beta tester feedback from the in-app form. Mark items reviewed after you have read them or taken action.
        </p>

        <AdminReviewTabs
          view={view}
          onViewChange={setView}
          pendingCount={pendingCount}
          ariaLabel="Beta feedback lists"
        />

        {loading ? (
          <p className="dashboard-loading mb-0">Loading feedback…</p>
        ) : items.length === 0 ? (
          <p className="dashboard-empty-copy mb-0">
            {view === 'pending' ? 'No pending beta feedback.' : 'No reviewed beta feedback yet.'}
          </p>
        ) : (
          <div className="team-member-list">
            {items.map((item) => (
              <div key={item.id} className="inbox-item-row">
                <div>
                  <div className="inbox-item-title">
                    <span>{item.username}</span>
                    {item.page_url && (
                      <Badge bg="info">{item.page_url}</Badge>
                    )}
                    <span className="inbox-item-meta">{formatWhen(item.created_at)}</span>
                  </div>
                  <div className="inbox-item-meta">{item.message}</div>
                </div>
                {view === 'pending' && !item.is_reviewed && (
                  <div className="inbox-item-actions">
                    <Button
                      size="sm"
                      variant="outline-success"
                      className="team-member-history-btn"
                      disabled={busy}
                      onClick={() => handleReview(item.id)}
                    >
                      Mark reviewed
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
