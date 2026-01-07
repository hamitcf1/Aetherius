import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
  redirectTo?: string;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerification = false,
  redirectTo = '/login',
}) => {
  const { currentUser, isEmailVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show loading indicator while checking auth state
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requireEmailVerification && !isEmailVerified) {
    // Redirect to email verification page if email is not verified
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  // User is authenticated (and email verified if required)
  return <>{children}</>;
};

export default ProtectedRoute;
