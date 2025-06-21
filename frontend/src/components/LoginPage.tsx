import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { Eye, EyeOff, Heart, Lock, Mail, User, Shield, UserPlus } from 'lucide-react';
import '../styles/LoginPage.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { validateEmail, validatePasswordPolicy, defaultPasswordPolicy } from '../utils/authUtils';

type LoginPageProps = {
  initialMode?: 'signin' | 'signup';
};

export default function LoginPage({ initialMode }: LoginPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const pathMode = location.pathname === '/signup' ? 'signup' : location.pathname === '/signin' ? 'signin' : undefined;
  const [isSignUp, setIsSignUp] = useState(() => {
    if (initialMode) return initialMode === 'signup';
    if (pathMode) return pathMode === 'signup';
    return false;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.HEALTHCARE_STAFF);
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const { login, register, isLoading, rateLimitInfo } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Check rate limiting
    if (rateLimitInfo.isBlocked) {
      const minutes = Math.ceil(rateLimitInfo.remainingTime / 60000);
      setError(`Too many login attempts. Please try again in ${minutes} minute(s).`);
      return;
    }
    
    if (isSignUp) {
      // --- Client-side validations specific to sign-up ---
      // Validate email format
      if (!validateEmail(email)) {
        setError('Please enter a valid email address.');
        return;
      }

      // Validate password policy (strength, length, etc.)
      const policyCheck = validatePasswordPolicy(password, defaultPasswordPolicy, { name, email });
      if (!policyCheck.isValid) {
        setError(policyCheck.errors.join(' • '));
        return;
      }

      // Confirm password match
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      
      // Handle sign up
      const result = await register({
        email,
        password,
        name,
        role,
        department: department || undefined
      });
      
      if (result.success) {
        setSuccess('Account created successfully! You can now sign in.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setName('');
        setDepartment('');
        navigate('/signin');
      } else {
        setError(result.error || 'Registration failed');
      }
    } else {
      // Handle sign in
      const successLogin = await login(email, password);
      if (!successLogin) {
        setError('Invalid credentials. Please check your email and password.');
      } else {
        navigate('/');
      }
    }
  };

  const demoAccounts = [
    { 
      email: 'patient@hospital.com', 
      role: 'Patient', 
      description: 'Basic translation access for patients and families',
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    { 
      email: 'nurse@hospital.com', 
      role: 'Healthcare Staff', 
      description: 'Enhanced translation features for medical staff',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    { 
      email: 'interpreter@hospital.com', 
      role: 'Medical Interpreter', 
      description: 'Review dashboard access and translation validation',
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    { 
      email: 'qa@hospital.com', 
      role: 'QA Reviewer', 
      description: 'Quality assurance, metrics, and compliance oversight',
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    { 
      email: 'admin@hospital.com', 
      role: 'Administrator', 
      description: 'Full system access and administrative controls',
      color: 'bg-red-50 border-red-200 text-red-800'
    }
  ];

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setError('');
    setSuccess('');
  };

  const toggleMode = () => {
    const newIsSignUp = !isSignUp;
    setIsSignUp(newIsSignUp);
    navigate(newIsSignUp ? '/signup' : '/signin');
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setDepartment('');
  };

  return (
    <div className="login-container" style={{ overflowX: 'hidden' }}>
      <div className="login-background">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <Link to="/" className="logo-container" aria-label="Go to Home">
              <div className="logo-icon">
                <Heart className="logo-heart" />
              </div>
              <h1 className="logo-title">LifeBridge</h1>
            </Link>
            <h2 className="login-title">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>            <p className="login-subtitle">
              {isSignUp 
                ? 'Join our translation platform'
                : 'Sign in to access translation services'
              }
            </p>
          </div>

          {/* Form */}
          {/* noValidate disables native browser validation pop-ups, letting us handle messaging ourselves */}
          <form className="login-form" noValidate onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <User size={16} />
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={16} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {isSignUp && (
              <>
                <div className="form-group">
                  <label htmlFor="role" className="form-label">
                    <Shield size={16} />
                    Role
                  </label>
                  <select
                    id="role"
                    className="form-input"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.HEALTHCARE_STAFF}>Healthcare Staff</option>
                    <option value={UserRole.MEDICAL_INTERPRETER}>Medical Interpreter</option>
                    <option value={UserRole.EMERGENCY_RESPONDER}>Emergency Responder</option>
                    <option value={UserRole.QA_REVIEWER}>QA Reviewer</option>
                    <option value={UserRole.COMPLIANCE_OFFICER}>Compliance Officer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="department" className="form-label">
                    Department (Optional)
                  </label>
                  <input
                    id="department"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Emergency, Cardiology, ICU"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} />
                Password
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input password-input"
                  placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isSignUp && password && (
                <div className="password-strength">
                  <div className={`strength-bar ${password.length >= 8 ? 'strong' : password.length >= 6 ? 'medium' : 'weak'}`}></div>
                  <span className="strength-text">
                    {password.length >= 8 ? 'Strong' : password.length >= 6 ? 'Medium' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  <Lock size={16} />
                  Confirm Password
                </label>
                <div className="password-input-container">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="form-input password-input"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className={`password-match ${password === confirmPassword ? 'match' : 'no-match'}`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error">
                <div className="alert-content">
                  <div className="alert-icon">⚠️</div>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <div className="alert-content">
                  <div className="alert-icon">✅</div>
                  <span>{success}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
            >
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  {isSignUp ? <UserPlus size={16} /> : <Lock size={16} />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>

            {/* Toggle Mode */}
            <div className="form-footer">
              <button
                type="button"
                onClick={toggleMode}
                className="toggle-mode-button"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>

          {/* Demo Accounts Section */}
          {!isSignUp && (
            <div className="demo-section">
              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="demo-toggle-button"
              >
                {showDemoAccounts ? 'Hide' : 'Show'} Demo Accounts
              </button>

              {showDemoAccounts && (
                <div className="demo-accounts">
                  <h3 className="demo-title">Quick Demo Access</h3>
                  <p className="demo-subtitle">All demo accounts use password: <code>demo123</code></p>
                  
                  <div className="demo-grid">
                    {demoAccounts.map((account) => (
                      <div key={account.email} className={`demo-card ${account.color}`}>
                        <div className="demo-card-content">
                          <div className="demo-info">
                            <h4 className="demo-role">{account.role}</h4>
                            <p className="demo-email">{account.email}</p>
                            <p className="demo-description">{account.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => quickLogin(account.email)}
                            className="demo-use-button"
                          >
                            Use Account
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}          {/* Footer */}
          <div className="login-footer">
            {!isSignUp && (
              <p className="footer-demo-note">
                This is a demo system. In production, integrate with your hospital's authentication system.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
