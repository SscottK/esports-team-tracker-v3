import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { APP_BETA_LABEL } from '../config/appMeta';
import {
  FEEDBACK_PAGE_OPTIONS,
  getFeedbackPageLabel,
  resolveFeedbackPagePath,
} from '../utils/feedbackPageOptions';
import * as feedbackApi from '../api/feedback';

export default function BetaFeedback() {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [pageUrl, setPageUrl] = useState(() => resolveFeedbackPagePath(location.pathname));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const pageLabel = getFeedbackPageLabel(pageUrl);
      await feedbackApi.submitBetaFeedback({
        message: message.trim(),
        page_url: pageLabel,
      });
      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message?.[0] || 'Unable to send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title="Beta feedback">
      <BackButton fallback="/dashboard" />
      <section className="esports-panel form-page-panel mt-3">
        <p className="form-page-intro">
          You are using {APP_BETA_LABEL}. Tell us what is working, what is confusing, or what you would like next.
        </p>

        {submitted ? (
          <Alert variant="success" className="mb-0">
            Thanks — your feedback was sent to the platform admin.
          </Alert>
        ) : (
          <>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit} className="coach-tools-form">
              <Form.Group className="mb-3">
                <Form.Label>Your feedback</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe the issue, idea, or praise..."
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Page you were on</Form.Label>
                <Form.Select
                  value={pageUrl}
                  onChange={(event) => setPageUrl(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a page
                  </option>
                  {FEEDBACK_PAGE_OPTIONS.map((option) => (
                    <option key={option.path} value={option.path}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button type="submit" disabled={submitting || !message.trim() || !pageUrl}>
                {submitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </Form>
          </>
        )}
      </section>
    </Page>
  );
}
