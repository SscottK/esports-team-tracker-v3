import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';

export default function AdminReviewTabs({
  view,
  onViewChange,
  pendingCount = 0,
  ariaLabel = 'Review lists',
}) {
  return (
    <div className="inbox-tabs" role="tablist" aria-label={ariaLabel}>
      <Button
        type="button"
        role="tab"
        aria-selected={view === 'pending'}
        variant="outline-primary"
        className={`inbox-tab${view === 'pending' ? ' inbox-tab-active' : ''}`}
        onClick={() => onViewChange('pending')}
      >
        Pending
        {pendingCount > 0 && (
          <Badge bg="danger" className="inbox-tab-count">{pendingCount}</Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={view === 'reviewed'}
        variant="outline-primary"
        className={`inbox-tab${view === 'reviewed' ? ' inbox-tab-active' : ''}`}
        onClick={() => onViewChange('reviewed')}
      >
        Reviewed
      </Button>
    </div>
  );
}
