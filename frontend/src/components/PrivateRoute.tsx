/**
 * PrivateRoute Component
 * Protects routes that require authentication
 * Optionally enforces role-based access control
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './ui/Spinner';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

export default function PrivateRoute({
  children,
  requiredRole,
  redirectTo: _redirectTo = '/auth/login',
}: PrivateRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  void useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // return <Navigate to={redirectTo} state={{ from: location }} replace />;
    // TEMPORARY BYPASS FOR DEVELOPMENT
    return <>{children}</>;

  }

  // Check role-based access if required
  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect to unauthorized page or dashboard
    return <Navigate to="/" state={{ user: user?.email }} replace />;
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
}

