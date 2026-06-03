import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import * as adminApi from '../api/admin';

function formatWhen(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

export default function ManageBetaFeedback() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getBetaFeedback();
      setItems(data);
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
  }, [user]);

  if (!user?.is_staff) {
    return (
      <Page title="Beta feedback">
        <Alert variant="warning">Platform admin access is required.</Alert>
      </Page>
    );
  }

  return (
    <Page title="Beta feedback">
      <BackButton fallback="/dashboard" />
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <p className="text-muted mb-0">Loading feedback…</p>
      ) : items.length === 0 ? (
        <p className="text-muted mb-0">No beta feedback yet.</p>
      ) : (
        <div className="beta-feedback-list">
          {items.map((item) => (
            <article key={item.id} className="esports-panel beta-feedback-item">
              <div className="beta-feedback-item-meta">
                <strong>{item.username}</strong>
                <span>{formatWhen(item.created_at)}</span>
              </div>
              {item.page_url && (
                <p className="beta-feedback-item-page mb-2">
                  Page: <code>{item.page_url}</code>
                </p>
              )}
              <p className="beta-feedback-item-message mb-0">{item.message}</p>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
