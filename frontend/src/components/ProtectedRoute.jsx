import { Navigate, Outlet } from 'react-router-dom';
import AppLoading from './AppLoading';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoading message="Checking session..." />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}
