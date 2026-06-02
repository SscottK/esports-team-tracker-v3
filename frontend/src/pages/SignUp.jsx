import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
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
    <Container style={{ maxWidth: '480px' }}>
      <Card>
        <Card.Body>
          <Card.Title>Create account</Card.Title>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Username</Form.Label>
              <Form.Control
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="password_confirm">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                name="password_confirm"
                value={form.password_confirm}
                onChange={handleChange}
                minLength={8}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Sign up'}
            </Button>
          </Form>
          <p className="mt-3 mb-0">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
