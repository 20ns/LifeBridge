import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { demoUserStorage, loginRateLimiter } from '../utils/authUtils';
import { UserRole, User, RegisterData, REVIEW_DASHBOARD_ROLES, ADMIN_PANEL_ROLES } from '../types/auth';
import { loginRequest, registerRequest } from '../services/authService';

// Re-export types for convenience
export type { User, RegisterData } from '../types/auth';
export { UserRole } from '../types/auth';

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

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialise synchronously so the first render already knows if a user was stored
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedStr = localStorage.getItem('lifebridge_user');
      if (storedStr) {
        return JSON.parse(storedStr) as User;
      }
    } catch {
      /* ignore JSON parse issues */
    }

    const demo = demoUserStorage.getCurrentUser();
    if (demo) {
      return {
        ...demo,
        lastLogin: demo.lastLogin ? new Date(demo.lastLogin) : undefined,
      } as User;
    }
    return null;
  });

  // While we already have a synchronous value, we still briefly verify asynchronously
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rateLimitInfo, setRateLimitInfo] = useState({ isBlocked: false, remainingTime: 0 });

  // Verify stored credentials once React is mounted (e.g., token expiry checks could be added here)
  useEffect(() => {
    // For now just finish the loading state – all work was done synchronously above.
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
      setRateLimitInfo({ isBlocked: true, remainingTime });
      return false;
    }

    setIsLoading(true);

    try {
      // Attempt backend login first
      try {
        const { token, user: remoteUser } = await loginRequest(email, password);
        localStorage.setItem('lifebridge_token', token);
        localStorage.setItem('lifebridge_user', JSON.stringify(remoteUser));
        setUser(remoteUser);
        setRateLimitInfo({ isBlocked: false, remainingTime: 0 });
        return true;
      } catch (apiError) {
        console.warn('Backend login failed, falling back to demo storage', apiError);
      }

      // Fallback to demo storage (offline/demo mode)
      const authenticatedUser = await demoUserStorage.authenticateUser(email, password);

      if (authenticatedUser) {
        const { passwordHash: _, ...userSession } = authenticatedUser;
        setUser({
          ...userSession,
          lastLogin: userSession.lastLogin ? new Date(userSession.lastLogin) : undefined
        });
        setRateLimitInfo({ isBlocked: false, remainingTime: 0 });
        return true;
      }

      return false;
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
      // Attempt backend registration first
      try {
        const result = await registerRequest({ ...userData });
        if (result.success && result.user && result.token) {
          localStorage.setItem('lifebridge_token', result.token);
          localStorage.setItem('lifebridge_user', JSON.stringify(result.user));
          setUser(result.user);
          return { success: true };
        }
        if (!result.success) {
          return { success: false, error: result.error };
        }
      } catch (apiError) {
        console.warn('Backend registration failed, falling back to demo storage', apiError);
      }

      // Fallback to demo storage
      const newUser = await demoUserStorage.createUser({
        ...userData,
        password: userData.password,
        isActive: true,
      });

      if (newUser) {
        return { success: true };
      }
      return { success: false, error: 'Email already exists' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('lifebridge_token');
    localStorage.removeItem('lifebridge_user');
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
