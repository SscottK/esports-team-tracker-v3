import ProgressBar from 'react-bootstrap/ProgressBar';

export default function ServerWakeOverlay({ active, progress, message, detail, failed }) {
  if (!active) {
    return null;
  }

  return (
    <div className="server-wake-overlay" role="alertdialog" aria-modal="true" aria-live="polite">
      <div className="server-wake-panel esports-panel">
        <p className="dashboard-eyebrow mb-2">Esports Team Tracker</p>
        <h2 className="server-wake-title">{message}</h2>
        <p className="server-wake-detail">{detail}</p>
        <div className="server-wake-progress-wrap">
          <ProgressBar
            now={progress}
            className="server-wake-progress"
            aria-label="Server startup progress"
          />
          <span className="server-wake-progress-label">{Math.round(progress)}%</span>
        </div>
        {failed && (
          <p className="server-wake-failed mb-0">
            Still waking up. Keep this tab open — we will retry automatically.
          </p>
        )}
      </div>
    </div>
  );
}
