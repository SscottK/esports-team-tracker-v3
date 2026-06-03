import { Link } from 'react-router-dom';
import { APP_BETA_LABEL } from '../config/appMeta';
import { useAuth } from '../context/AuthContext';

export default function AppFooter() {
  const { user } = useAuth();

  return (
    <footer className="app-beta-footer">
      <span className="app-beta-footer-label">{APP_BETA_LABEL}</span>
      {user ? (
        <Link to="/feedback" className="app-beta-footer-link">
          Send beta feedback
        </Link>
      ) : (
        <Link to="/signin" className="app-beta-footer-link">
          Sign in to send feedback
        </Link>
      )}
    </footer>
  );
}
