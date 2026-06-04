import { Link } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { DJANGO_ADMIN_LINKS, djangoAdminUrl } from '../utils/djangoAdminLinks';

const IN_APP_ADMIN_LINKS = [
  { label: 'Game suggestions', to: '/admin/game-suggestions', description: 'Review user-suggested catalog games.' },
  { label: 'Password reset requests', to: '/admin/password-reset-requests', description: 'Handle reset requests from sign-in.' },
  { label: 'Beta feedback', to: '/admin/beta-feedback', description: 'Review in-app beta feedback submissions.' },
];

export default function ManageAdminPanel() {
  const { user } = useAuth();

  if (!user?.is_staff) {
    return (
      <Page title="Admin panel" actions={<BackButton fallback="/dashboard" />}>
        <Alert variant="warning">Platform admin access is required.</Alert>
      </Page>
    );
  }

  return (
    <Page title="Admin panel" actions={<BackButton fallback="/dashboard" />}>
      <section className="esports-panel form-page-panel mb-4">
        <p className="form-page-intro mb-3">
          Review staff queues in the app, or jump to Django admin for catalog, user, and data management.
        </p>
        <div className="admin-queue-list mb-0">
          {IN_APP_ADMIN_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="admin-queue-link">
              <span>
                <span className="admin-queue-link-label">{link.label}</span>
                <span className="admin-panel-link-desc">{link.description}</span>
              </span>
              <span className="admin-panel-link-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="esports-panel form-page-panel mb-4">
        <h2 className="inbox-section-heading">Django admin</h2>
        <p className="form-page-intro mb-0">
          You must be signed in as a staff user in the browser session for these links to work.
        </p>
      </section>

      <div className="admin-queue-list">
        {DJANGO_ADMIN_LINKS.map((link) => (
          <a
            key={link.path}
            href={djangoAdminUrl(link.path)}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-queue-link"
          >
            <span>
              <span className="admin-queue-link-label">{link.label}</span>
              <span className="admin-panel-link-desc">{link.description}</span>
            </span>
            <span className="admin-panel-link-arrow" aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </Page>
  );
}
