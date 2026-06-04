import { Link } from 'react-router-dom';
import { APP_BETA_LABEL } from '../config/appMeta';
import { useAuth } from '../context/AuthContext';
import { useFeedbackModal } from '../context/FeedbackModalContext';

export default function AppFooter() {
  const { user } = useAuth();
  const { openFeedback } = useFeedbackModal();

  return (
    <footer className="app-beta-footer">
      <span className="app-beta-footer-label">{APP_BETA_LABEL}</span>
      {user ? (
        <button type="button" className="app-beta-footer-link" onClick={openFeedback}>
          Send beta feedback
        </button>
      ) : (
        <Link to="/signin" className="app-beta-footer-link">
          Sign in to send feedback
        </Link>
      )}
    </footer>
  );
}
