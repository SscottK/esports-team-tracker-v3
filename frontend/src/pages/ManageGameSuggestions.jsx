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
import * as gamesApi from '../api/games';

export default function ManageGameSuggestions() {
  const { user } = useAuth();
  const { refreshNav } = useNav();
  const [suggestions, setSuggestions] = useState([]);
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
        gamesApi.getAdminGameSuggestions(view !== 'pending'),
        adminApi.getAdminPendingCounts(),
      ]);
      setSuggestions(data);
      setPendingCount(counts.game_suggestions || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load game suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_staff) {
      load();
    }
  }, [user, view]);

  const handlePromote = async (suggestionId, gameName) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await gamesApi.promoteGameSuggestion(suggestionId);
      setSuccess(`"${gameName}" added to the catalog. Add tracks in Django admin or the admin API.`);
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to add game to catalog.');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async (suggestionId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await gamesApi.dismissGameSuggestion(suggestionId);
      setSuccess('Suggestion dismissed.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to dismiss suggestion.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (suggestionId) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await gamesApi.deleteGameSuggestion(suggestionId);
      setSuccess('Suggestion deleted.');
      await Promise.all([load(), refreshNav()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to delete suggestion.');
    } finally {
      setBusy(false);
    }
  };

  if (!user?.is_staff) {
    return (
      <Page title="Game suggestions" actions={<BackButton fallback="/dashboard" />}>
        <Alert variant="warning">Platform admin access is required.</Alert>
      </Page>
    );
  }

  return (
    <Page
      title="Game suggestions"
      actions={<BackButton fallback="/dashboard" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <p className="form-page-intro mb-3">
          Review games suggested by users. Promoting creates a catalog entry coaches can assign to teams.
          You still add tracks/levels in Django admin afterward.
        </p>

        <AdminReviewTabs
          view={view}
          onViewChange={setView}
          pendingCount={pendingCount}
          ariaLabel="Game suggestion lists"
        />

        {loading ? (
          <p className="dashboard-loading mb-0">Loading suggestions…</p>
        ) : suggestions.length === 0 ? (
          <p className="dashboard-empty-copy mb-0">
            {view === 'pending' ? 'No pending game suggestions.' : 'No reviewed game suggestions yet.'}
          </p>
        ) : (
          <div className="team-member-list">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="inbox-item-row">
                <div>
                  <div className="inbox-item-title">
                    <span>{suggestion.game_name}</span>
                    {view === 'reviewed' && <Badge bg="secondary">Reviewed</Badge>}
                  </div>
                  <div className="inbox-item-meta">
                    Suggested by {suggestion.suggested_by_username}
                    {' · '}
                    {new Date(suggestion.created_at).toLocaleString()}
                  </div>
                </div>
                {view === 'pending' && !suggestion.is_reviewed && (
                  <div className="inbox-item-actions">
                    <Button
                      size="sm"
                      variant="outline-success"
                      className="team-member-history-btn"
                      disabled={busy}
                      onClick={() => handlePromote(suggestion.id, suggestion.game_name)}
                    >
                      Add to catalog
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="team-member-history-btn"
                      disabled={busy}
                      onClick={() => handleDismiss(suggestion.id)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      className="team-member-history-btn"
                      disabled={busy}
                      onClick={() => handleDelete(suggestion.id)}
                    >
                      Delete
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
