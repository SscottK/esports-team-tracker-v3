import Container from 'react-bootstrap/Container';

export default function AppLoading({ message = 'Loading...' }) {
  return (
    <Container className="app-loading-shell esports-page">
      <div className="app-loading-panel esports-panel">
        <div className="app-loading-spinner" aria-hidden="true" />
        <p className="dashboard-panel-meta mb-0">{message}</p>
      </div>
    </Container>
  );
}
