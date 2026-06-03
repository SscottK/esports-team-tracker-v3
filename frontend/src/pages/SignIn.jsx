import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
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
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to sign in. Check your credentials.');
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
        <p className="dashboard-eyebrow mb-2">Welcome back</p>
        <h1 className="coach-tools-section-title mb-3">Sign in</h1>
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
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </Form.Group>
          <Button type="submit" variant="outline-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Form>
      </section>
      <p className="auth-footer-text mt-3 mb-0">
        <Link to="/forgot-password">Forgot password?</Link>
        {' · '}
        Need an account? <Link to="/signup">Sign up</Link>
      </p>
    </Container>
  );
}
