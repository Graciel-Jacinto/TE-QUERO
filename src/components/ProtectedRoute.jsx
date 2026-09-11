import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile?.rules_accepted_at) {
    return <Navigate to="/onboarding/bem-vindo" replace />;
  }

  if (!profile?.onboarding_completed) {
    return <Navigate to="/onboarding/perfil" replace />;
  }

  return <Outlet />;
}