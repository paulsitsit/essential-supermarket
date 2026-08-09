import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

export default function ProtectedRoute({ roles }) {
  const { account, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!account) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(account.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}