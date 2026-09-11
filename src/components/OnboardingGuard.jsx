import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

export default function OnboardingGuard() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" replace />;

  if (profile?.onboarding_completed) {
    return <Navigate to="/app/descobrir" replace />;
  }

  return <Outlet />;
}