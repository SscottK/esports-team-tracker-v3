import { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import * as authApi from '../api/auth';

export default function ForgotPassword() {
  const [form, setForm] = useState({ username: '', contact_email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await authApi.createPasswordResetRequest(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit password reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="auth-shell esports-page" style={{ maxWidth: '520px' }}>
      <div className="auth-form-header mb-3">
        <BackButton fallback="/signin" label="Sign in" />
      </div>
      <section className="esports-panel form-page-panel auth-form-panel">
        <p className="dashboard-eyebrow mb-2">Account help</p>
        <h1 className="coach-tools-section-title mb-3">Request password reset</h1>
        <p className="form-page-intro">
          Submit your username and a platform admin will review the request, then reset your password manually.
        </p>

        {submitted ? (
          <Alert variant="success" className="mb-0">
            If an account matches that username, a platform admin will review your request.
          </Alert>
        ) : (
          <>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit} className="coach-tools-form">
              <Form.Group>
                <Form.Label>Username</Form.Label>
                <Form.Control
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Contact email (optional)</Form.Label>
                <Form.Control
                  type="email"
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="Where we can reach you if needed"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Note (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Anything that helps the admin verify this request"
                />
              </Form.Group>
              <Button type="submit" variant="outline-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit request'}
              </Button>
            </Form>
          </>
        )}
      </section>
      <p className="auth-footer-text mt-3 mb-0">
        Remember your password? <Link to="/signin">Sign in</Link>
      </p>
    </Container>
  );
}
