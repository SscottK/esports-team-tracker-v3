import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import * as gamesApi from '../api/games';

export default function SuggestGame() {
  const [suggestedGameName, setSuggestedGameName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSuggestGame = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await gamesApi.suggestGame(suggestedGameName);
      setSuggestedGameName('');
      setSuccess('Game suggestion sent. A platform admin will review it.');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.game_name?.[0] || 'Unable to send suggestion.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Suggest a game"
      actions={<BackButton fallback="/dashboard" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="esports-panel form-page-panel">
        <h3 className="coach-tools-section-title">Catalog suggestion</h3>
        <p className="form-page-intro">
          Missing a game from the catalog? Suggest it here. Platform admins review suggestions
          before adding new games.
        </p>
        <Form onSubmit={handleSuggestGame} className="coach-tools-inline-form">
          <Form.Control
            placeholder="Game name"
            value={suggestedGameName}
            onChange={(e) => setSuggestedGameName(e.target.value)}
            required
          />
          <Button type="submit" variant="outline-primary" disabled={busy}>
            Send suggestion
          </Button>
        </Form>
      </section>
    </Page>
  );
}
