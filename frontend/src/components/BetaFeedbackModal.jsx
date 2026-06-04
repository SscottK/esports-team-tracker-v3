import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { APP_BETA_LABEL } from '../config/appMeta';
import {
  getFeedbackPageLabel,
  resolveFeedbackPagePath,
} from '../utils/feedbackPageOptions';
import * as feedbackApi from '../api/feedback';

export default function BetaFeedbackModal({ show, onHide }) {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [pagePath, setPagePath] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) {
      return;
    }
    setPagePath(resolveFeedbackPagePath(location.pathname));
    setMessage('');
    setSubmitted(false);
    setError('');
  }, [show, location.pathname]);

  const pageLabel = pagePath
    ? getFeedbackPageLabel(pagePath)
    : getFeedbackPageLabel('other');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const resolvedPath = pagePath || 'other';
      await feedbackApi.submitBetaFeedback({
        message: message.trim(),
        page_url: getFeedbackPageLabel(resolvedPath),
      });
      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message?.[0] || 'Unable to send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="esports-modal">
      <Modal.Header closeButton>
        <Modal.Title>Send beta feedback</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="form-page-intro mb-3">
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
                <Form.Label>Page</Form.Label>
                <div className="feedback-modal-page-label">{pageLabel}</div>
                <Form.Text className="text-muted">
                  Captured automatically from where you opened this form.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Your feedback</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe the issue, idea, or praise..."
                  required
                  autoFocus
                />
              </Form.Group>
              <div className="d-flex flex-wrap gap-2">
                <Button type="submit" disabled={submitting || !message.trim()}>
                  {submitting ? 'Sending…' : 'Send feedback'}
                </Button>
                <Button type="button" variant="outline-secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal.Body>
      {submitted && (
        <Modal.Footer>
          <Button variant="outline-primary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}
