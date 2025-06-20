import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback = <UnauthorizedAccess />,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    return <LoginRequired />;
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return fallback;
  }

  return <>{children}</>;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Authentication Required</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please log in to access this feature.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function UnauthorizedAccess() {
  const { user } = useAuth();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your role ({user?.role}) does not have permission to access this feature.
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Logged in as: {user?.name}</p>
            <p>Department: {user?.department || 'N/A'}</p>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
