import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import '../styles/UserProfile.css';

export default function UserProfile() {
  const { user, logout, canAccessReviewDashboard, canAccessAdminPanel } = useAuth();

  if (!user) return null;

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case UserRole.MEDICAL_INTERPRETER:
        return 'bg-blue-100 text-blue-800';
      case UserRole.QA_REVIEWER:
        return 'bg-green-100 text-green-800';
      case UserRole.COMPLIANCE_OFFICER:
        return 'bg-yellow-100 text-yellow-800';
      case UserRole.HEALTHCARE_STAFF:
        return 'bg-indigo-100 text-indigo-800';
      case UserRole.EMERGENCY_RESPONDER:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'System Administrator';
      case UserRole.MEDICAL_INTERPRETER:
        return 'Medical Interpreter';
      case UserRole.QA_REVIEWER:
        return 'Quality Assurance Reviewer';
      case UserRole.COMPLIANCE_OFFICER:
        return 'Compliance Officer';
      case UserRole.HEALTHCARE_STAFF:
        return 'Healthcare Staff';
      case UserRole.EMERGENCY_RESPONDER:
        return 'Emergency Responder';
      case UserRole.PATIENT:
        return 'Patient';
      default:
        return role;
    }
  };

  return (
    <div className="user-profile-container">
      <div className="user-info-header">
        <div className="avatar-circle">
          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <div className="mt-2 flex items-center space-x-2">
            <span className={`badge`} style={{backgroundColor:'var(--neutral-100)'}}>
              {getRoleDisplayName(user.role)}
            </span>
            {user.department && (
              <span className="badge">
                {user.department}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="badge permission-restricted"
        >
          Sign Out
        </button>
      </div>

      {/* Access Level Information */}
      <div className="section">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Access Permissions</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Basic Translation</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Granted
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Review Dashboard</span>
            <span className={`permission-badge ${ canAccessReviewDashboard() ? 'permission-granted' : 'permission-restricted' }`}>
              {canAccessReviewDashboard() ? '✓ Granted' : '✗ Restricted'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Admin Panel</span>
            <span className={`permission-badge ${ canAccessAdminPanel() ? 'permission-granted' : 'permission-restricted' }`}>
              {canAccessAdminPanel() ? '✓ Granted' : '✗ Restricted'}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {(user.certifications || user.hospitalId || user.lastLogin) && (
        <div className="section additional-info">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h3>
          <dl className="space-y-2">
            {user.hospitalId && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Hospital ID</dt>
                <dd className="text-sm text-gray-900">{user.hospitalId}</dd>
              </div>
            )}
            {user.certifications && user.certifications.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Certifications</dt>
                <dd className="text-sm text-gray-900">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
            {user.lastLogin && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Last Login</dt>
                <dd className="text-sm text-gray-900">
                  {user.lastLogin.toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
