import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <Container className="py-5 text-center">
      <h1 className="display-5 mb-3">Esports Team Tracker v3</h1>
      <p className="lead text-muted mb-4">
        Track team progress, times, and coaching workflows in one place.
      </p>
      {user ? (
        <Button as={Link} to="/dashboard" variant="primary" size="lg">
          Go to dashboard
        </Button>
      ) : (
        <div className="d-flex justify-content-center gap-2">
          <Button as={Link} to="/signup" variant="primary" size="lg">
            Get started
          </Button>
          <Button as={Link} to="/signin" variant="outline-primary" size="lg">
            Sign in
          </Button>
        </div>
      )}
    </Container>
  );
}
