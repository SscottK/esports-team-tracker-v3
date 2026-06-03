import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  username: '',
  email: '',
  password: '',
  password_confirm: '',
};

export default function SignUp() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const formatError = (data) => {
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' ');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(formatError(err.response?.data || 'Unable to create account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="auth-shell esports-page" style={{ maxWidth: '480px' }}>
      <div className="auth-form-header mb-3">
        <BackButton fallback="/" label="Home" />
      </div>
      <section className="esports-panel form-page-panel auth-form-panel">
        <p className="dashboard-eyebrow mb-2">Get started</p>
        <h1 className="coach-tools-section-title mb-3">Create account</h1>
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
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Confirm password</Form.Label>
            <Form.Control
              type="password"
              name="password_confirm"
              value={form.password_confirm}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Form.Group>
          <Button type="submit" variant="outline-primary" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Sign up'}
          </Button>
        </Form>
      </section>
      <p className="auth-footer-text mt-3 mb-0">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </Container>
  );
}
