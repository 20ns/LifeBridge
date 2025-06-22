import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { demoUserStorage, loginRateLimiter } from '../utils/authUtils';

// User roles enum
export enum UserRole {
  PATIENT = 'patient',
  HEALTHCARE_STAFF = 'healthcare_staff',
  EMERGENCY_RESPONDER = 'emergency_responder',
  MEDICAL_INTERPRETER = 'medical_interpreter',
  QA_REVIEWER = 'qa_reviewer',
  COMPLIANCE_OFFICER = 'compliance_officer',
  ADMIN = 'admin'
}

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  hospitalId?: string;
  certifications?: string[];
  lastLogin?: Date;
  isActive: boolean;
}

// Registration data interface
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  department?: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessReviewDashboard: () => boolean;
  canAccessAdminPanel: () => boolean;
  isLoading: boolean;
  rateLimitInfo: { isBlocked: boolean; remainingTime: number };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role permissions configuration
const REVIEW_DASHBOARD_ROLES = [
  UserRole.MEDICAL_INTERPRETER,
  UserRole.QA_REVIEWER,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.ADMIN
];

const ADMIN_PANEL_ROLES = [
  UserRole.ADMIN,
  UserRole.COMPLIANCE_OFFICER
];

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rateLimitInfo, setRateLimitInfo] = useState({ isBlocked: false, remainingTime: 0 });

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = demoUserStorage.getCurrentUser();
    if (currentUser) {
      setUser({
        ...currentUser,
        lastLogin: currentUser.lastLogin ? new Date(currentUser.lastLogin) : undefined
      });
    }
    setIsLoading(false);
  }, []);

  // Update rate limit info periodically
  useEffect(() => {
    const updateRateLimit = () => {
      const remainingTime = loginRateLimiter.getRemainingTime('global');
      setRateLimitInfo({
        isBlocked: remainingTime > 0,
        remainingTime
      });
    };

    updateRateLimit();
    const interval = setInterval(updateRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!loginRateLimiter.canAttempt('global')) {
      const remainingTime = loginRateLimiter.getRemainingTime('global');
      setRateLimitInfo({
        isBlocked: true,
        remainingTime
      });
      return false;
    }

    setIsLoading(true);
    
    try {
      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const authenticatedUser = await demoUserStorage.authenticateUser(email, password);
      
      if (authenticatedUser) {
        const { passwordHash: _, ...userSession } = authenticatedUser;
        setUser({
          ...userSession,
          lastLogin: userSession.lastLogin ? new Date(userSession.lastLogin) : undefined
        });
        setRateLimitInfo({ isBlocked: false, remainingTime: 0 });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser = await demoUserStorage.createUser({
        ...userData,
        password: userData.password,
        isActive: true
      });
      
      if (newUser) {
        return { success: true };
      } else {
        return { success: false, error: 'Email already exists' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    demoUserStorage.logout();
    setUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const canAccessReviewDashboard = (): boolean => {
    return hasRole(REVIEW_DASHBOARD_ROLES);
  };

  const canAccessAdminPanel = (): boolean => {
    return hasRole(ADMIN_PANEL_ROLES);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    register,
    hasRole,
    canAccessReviewDashboard,
    canAccessAdminPanel,
    isLoading,
    rateLimitInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
