import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useAuth } from '../context/AuthContext';
import { DJANGO_ADMIN_LINKS, djangoAdminUrl } from '../utils/djangoAdminLinks';

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
        <p className="form-page-intro mb-0">
          Jump to Django admin for catalog, user, and data management. You must be signed in as a staff user
          in the browser session for these links to work.
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
