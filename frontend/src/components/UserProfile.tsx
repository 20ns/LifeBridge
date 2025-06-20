import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { User, Mail, MapPin, Shield, Settings, LogOut, Edit3, Save, X, Users, Clock, Award } from 'lucide-react';
import '../styles/UserProfile.css';

export default function UserProfile() {
  const { user, logout, canAccessReviewDashboard, canAccessAdminPanel } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

  if (!user) return null;
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.MEDICAL_INTERPRETER:
        return 'medical-interpreter';
      case UserRole.QA_REVIEWER:
        return 'qa-reviewer';
      case UserRole.COMPLIANCE_OFFICER:
        return 'compliance-officer';
      case UserRole.HEALTHCARE_STAFF:
        return 'healthcare-staff';
      case UserRole.EMERGENCY_RESPONDER:
        return 'emergency-responder';
      case UserRole.PATIENT:
        return 'patient';
      default:
        return 'patient';
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
  const handleSave = () => {
    // Here you would typically save the changes to the backend
    setIsEditing(false);
    // Update user data logic would go here
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
  };

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div className="avatar-status">
              <div className="status-indicator"></div>
            </div>
          </div>
          
          <div className="profile-info">
            {isEditing ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editedUser?.name || ''}
                  onChange={(e) => setEditedUser(prev => prev ? {...prev, name: e.target.value} : null)}
                  className="edit-input name-input"
                  placeholder="Full name"
                />
                <input
                  type="text"
                  value={editedUser?.department || ''}
                  onChange={(e) => setEditedUser(prev => prev ? {...prev, department: e.target.value} : null)}
                  className="edit-input department-input"
                  placeholder="Department"
                />
              </div>
            ) : (
              <>
                <h1 className="profile-name">{user.name}</h1>
                <div className="profile-details">
                  <div className="detail-item">
                    <Mail size={16} />
                    <span>{user.email}</span>
                  </div>
                  {user.department && (
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>{user.department}</span>
                    </div>
                  )}
                </div>
              </>
            )}
            
            <div className="role-badge-container">
              <div className={`role-badge ${getRoleBadgeColor(user.role)}`}>
                <Shield size={14} />
                <span>{getRoleDisplayName(user.role)}</span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            {isEditing ? (
              <div className="edit-actions">
                <button onClick={handleSave} className="action-btn save-btn">
                  <Save size={16} />
                  Save
                </button>
                <button onClick={handleCancel} className="action-btn cancel-btn">
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="view-actions">
                <button onClick={() => setIsEditing(true)} className="action-btn edit-btn">
                  <Edit3 size={16} />
                  Edit
                </button>
                <button onClick={logout} className="action-btn logout-btn">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="permissions-section">
        <div className="section-header">
          <Users size={20} />
          <h2>Access Permissions</h2>
        </div>
        <div className="permissions-grid">
          <div className="permission-item granted">
            <div className="permission-icon">✓</div>
            <div className="permission-details">
              <h3>Basic Translation</h3>
              <p>Core translation features and emergency phrases</p>
            </div>
          </div>
          
          <div className={`permission-item ${canAccessReviewDashboard() ? 'granted' : 'restricted'}`}>
            <div className="permission-icon">{canAccessReviewDashboard() ? '✓' : '✗'}</div>
            <div className="permission-details">
              <h3>Review Dashboard</h3>
              <p>Human review workflow and quality assurance</p>
            </div>
          </div>
          
          <div className={`permission-item ${canAccessAdminPanel() ? 'granted' : 'restricted'}`}>
            <div className="permission-icon">{canAccessAdminPanel() ? '✓' : '✗'}</div>
            <div className="permission-details">
              <h3>Admin Panel</h3>
              <p>System administration and user management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      {(user.certifications || user.hospitalId || user.lastLogin) && (
        <div className="additional-info-section">
          <div className="section-header">
            <Settings size={20} />
            <h2>Additional Information</h2>
          </div>
          
          <div className="info-grid">
            {user.hospitalId && (
              <div className="info-card">
                <div className="info-icon">
                  <MapPin size={16} />
                </div>
                <div className="info-content">
                  <label>Hospital ID</label>
                  <span>{user.hospitalId}</span>
                </div>
              </div>
            )}
            
            {user.certifications && user.certifications.length > 0 && (
              <div className="info-card certifications">
                <div className="info-icon">
                  <Award size={16} />
                </div>
                <div className="info-content">
                  <label>Certifications</label>
                  <div className="certification-list">
                    {user.certifications.map((cert, index) => (
                      <span key={index} className="certification-badge">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {user.lastLogin && (
              <div className="info-card">
                <div className="info-icon">
                  <Clock size={16} />
                </div>
                <div className="info-content">
                  <label>Last Login</label>
                  <span>{user.lastLogin.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
