import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

export default function AdminRoute() {
  const { user, isStaff, loading } = useAuth();

  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/app/descobrir" replace />;

  return <Outlet />;
}