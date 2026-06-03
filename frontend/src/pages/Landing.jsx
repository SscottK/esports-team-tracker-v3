import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <Container className="auth-shell esports-page landing-shell">
      <div className="auth-hero esports-panel mx-auto text-center">
        <p className="dashboard-eyebrow mb-2">Esports Team Tracker</p>
        <h1 className="landing-title mb-3">Track teams. Climb the grid.</h1>
        <p className="landing-lead mb-4">
          Track team progress, times, and coaching workflows in one place.
        </p>
        {user ? (
          <Button as={Link} to="/dashboard" variant="outline-primary" className="px-4">
            Go to dashboard
          </Button>
        ) : (
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
            <Button as={Link} to="/signup" variant="outline-primary" className="px-4">
              Get started
            </Button>
            <Button as={Link} to="/signin" variant="outline-primary" className="px-4">
              Sign in
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}
