import {
  Navigate,
  Outlet,
  useLocation
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

export default function ProtectedRoute({
  roles
}) {
  const {
    account,
    loading
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!account) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  const userRole = String(
    account.role || ''
  ).toLowerCase();

  const allowedRoles = Array.isArray(roles)
    ? roles.map(role =>
        String(role).toLowerCase()
      )
    : null;

  if (
    allowedRoles &&
    !allowedRoles.includes(userRole)
  ) {
    return (
      <Navigate
        to="/sales"
        replace
      />
    );
  }

  return <Outlet />;
}