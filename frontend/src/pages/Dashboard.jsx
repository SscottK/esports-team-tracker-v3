import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Container>
      <Card>
        <Card.Body>
          <Card.Title>Dashboard</Card.Title>
          <Card.Text>
            Welcome, <strong>{user?.username}</strong>. Auth is wired up — teams and times come next.
          </Card.Text>
        </Card.Body>
      </Card>
    </Container>
  );
}
