import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
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
  const [showReviewed, setShowReviewed] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, counts] = await Promise.all([
        adminApi.getBetaFeedback(showReviewed),
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
  }, [user, showReviewed]);

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

      <section className="esports-panel form-page-panel mb-4">
        <p className="form-page-intro mb-3">
          Review beta tester feedback from the in-app form. Mark items reviewed after you have read them or taken action.
        </p>
        <Form.Check
          type="switch"
          id="show-reviewed-beta-feedback"
          label="Show reviewed feedback"
          checked={showReviewed}
          onChange={(event) => setShowReviewed(event.target.checked)}
        />
        {!showReviewed && pendingCount > 0 && (
          <p className="dashboard-panel-meta mt-3 mb-0">{pendingCount} pending submission(s)</p>
        )}
      </section>

      {loading ? (
        <p className="dashboard-loading">Loading feedback…</p>
      ) : items.length === 0 ? (
        <Alert variant="info" className="dashboard-empty-alert mb-0">
          {showReviewed ? 'No beta feedback yet.' : 'No pending beta feedback.'}
        </Alert>
      ) : (
        <section className="esports-panel form-page-panel">
          <div className="team-member-list">
            {items.map((item) => (
              <div key={item.id} className="inbox-item-row">
                <div>
                  <div className="inbox-item-title">
                    <span>{item.username}</span>
                    <Badge bg={item.is_reviewed ? 'secondary' : 'warning'} text={item.is_reviewed ? undefined : 'dark'}>
                      {item.is_reviewed ? 'Reviewed' : 'Pending'}
                    </Badge>
                    {item.page_url && (
                      <Badge bg="info">{item.page_url}</Badge>
                    )}
                  </div>
                  <div className="inbox-item-meta">{formatWhen(item.created_at)}</div>
                  <div className="inbox-item-meta">{item.message}</div>
                </div>
                {!item.is_reviewed && (
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
        </section>
      )}
    </Page>
  );
}
