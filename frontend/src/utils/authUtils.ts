// Password hashing and validation utilities
// This provides client-side hashing for demo purposes
// In production, always hash passwords on the server side

import { UserRole, User, RegisterData } from '../types/auth';

// Simple hash function for demo purposes
// In production, use proper server-side hashing (bcrypt, Argon2, etc.)
async function simpleHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'lifebridge_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Password strength validation
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }

  // Common password patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common password patterns');
  }

  return {
    score: Math.min(5, score),
    feedback,
    isValid: score >= 3 && password.length >= 8
  };
}

// User account interface for demo storage
export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  certifications?: string[];
  hospitalId?: string;
}

// Demo user storage (in production, this would be in a secure database)
class DemoUserStorage {
  private readonly STORAGE_KEY = 'lifebridge_demo_users';
  private readonly CURRENT_USER_KEY = 'lifebridge_current_user';

  // Predefined demo accounts
  private readonly defaultUsers: Omit<DemoUser, 'passwordHash'>[] = [
    {
      id: '1',
      email: 'patient@hospital.com',
      name: 'John Patient',
      role: UserRole.PATIENT,
      createdAt: new Date('2025-01-01'),
      isActive: true
    },
    {
      id: '2',
      email: 'nurse@hospital.com',
      name: 'Sarah Nurse',
      role: UserRole.HEALTHCARE_STAFF,
      department: 'Emergency',
      createdAt: new Date('2025-01-01'),
      isActive: true,
      certifications: ['RN', 'ACLS'],
      hospitalId: 'DEMO_HOSPITAL_001'
    },
    {
      id: '3',
      email: 'interpreter@hospital.com',
      name: 'Maria Interpreter',
      role: UserRole.MEDICAL_INTERPRETER,
      department: 'Translation Services',
      createdAt: new Date('2025-01-01'),
      isActive: true,
      certifications: ['CMI', 'Spanish-English'],
      hospitalId: 'DEMO_HOSPITAL_001'
    },
    {
      id: '4',
      email: 'qa@hospital.com',
      name: 'David QA',
      role: UserRole.QA_REVIEWER,
      department: 'Quality Assurance',
      createdAt: new Date('2025-01-01'),
      isActive: true,
      certifications: ['CQA', 'Six Sigma'],
      hospitalId: 'DEMO_HOSPITAL_001'
    },
    {
      id: '5',
      email: 'admin@hospital.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      department: 'IT Administration',
      createdAt: new Date('2025-01-01'),
      isActive: true,
      certifications: ['CISSP', 'HIPAA'],
      hospitalId: 'DEMO_HOSPITAL_001'
    }
  ];

  async initializeDefaultUsers(): Promise<void> {
    const existingUsers = this.getAllUsers();
    
    if (existingUsers.length === 0) {
      // Initialize with default demo users
      const defaultPassword = 'demo123';
      const passwordHash = await simpleHash(defaultPassword);
      
      const users: DemoUser[] = this.defaultUsers.map(user => ({
        ...user,
        passwordHash
      }));
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    }
  }

  getAllUsers(): DemoUser[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async createUser(userData: Omit<DemoUser, 'id' | 'passwordHash' | 'createdAt'> & { password: string }): Promise<DemoUser | null> {
    const users = this.getAllUsers();
    
    // Check if email already exists
    if (users.find(user => user.email === userData.email)) {
      return null;
    }

    const passwordHash = await simpleHash(userData.password);
    const newUser: DemoUser = {
      ...userData,
      id: Date.now().toString(),
      passwordHash,
      createdAt: new Date()
    };

    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    
    return newUser;
  }

  async authenticateUser(email: string, password: string): Promise<DemoUser | null> {
    await this.initializeDefaultUsers();
    
    const users = this.getAllUsers();
    const user = users.find(user => user.email === email && user.isActive);
    
    if (!user) {
      return null;
    }

    const passwordHash = await simpleHash(password);
    
    if (user.passwordHash === passwordHash) {
      // Update last login
      user.lastLogin = new Date();
      const userIndex = users.findIndex(u => u.id === user.id);
      users[userIndex] = user;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
      
      // Store current user session
      const { passwordHash: _, ...userSession } = user;
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userSession));
      
      return user;
    }

    return null;
  }

  getCurrentUser(): Omit<DemoUser, 'passwordHash'> | null {
    const stored = localStorage.getItem(this.CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  logout(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  updateUser(id: string, updates: Partial<DemoUser>): boolean {
    const users = this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return false;
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    
    // Update current user session if it's the same user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === id) {
      const { passwordHash: _, ...updatedSession } = users[userIndex];
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(updatedSession));
    }
    
    return true;
  }

  deleteUser(id: string): boolean {
    const users = this.getAllUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    
    if (filteredUsers.length === users.length) {
      return false; // User not found
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredUsers));
    
    // Clear session if it's the deleted user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === id) {
      this.logout();
    }
    
    return true;
  }
}

// Export singleton instance
export const demoUserStorage = new DemoUserStorage();

// Utility functions for form validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequiredField(value: string): boolean {
  return value.trim().length > 0;
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(name.trim());
}

// Security utilities
export function generateSecureId(): string {
  return crypto.randomUUID();
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Rate limiting for demo purposes
class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly maxAttempts = 5;
  // Reduce or disable the cooldown window (0 ms ⇢ no waiting period). Adjust as needed for production.
  private readonly windowMs = 0; // originally 15 * 60 * 1000 (15 minutes)

  canAttempt(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (now - record.lastAttempt > this.windowMs) {
      // Reset window
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    record.lastAttempt = now;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || record.count < this.maxAttempts) {
      return 0;
    }

    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
}

export const loginRateLimiter = new RateLimiter();

// Password policy enforcement
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPatterns: boolean;
  forbidPersonalInfo: boolean;
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbidCommonPatterns: true,
  forbidPersonalInfo: true
};

export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicy = defaultPasswordPolicy,
  userInfo?: { name?: string; email?: string }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (policy.forbidCommonPatterns) {
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /111111/,
      /000000/,
      /123123/
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns that are not allowed');
    }
  }

  if (policy.forbidPersonalInfo && userInfo) {
    const personalInfo = [
      userInfo.name?.toLowerCase(),
      userInfo.email?.split('@')[0]?.toLowerCase()
    ].filter(Boolean);

    if (personalInfo.some(info => info && password.toLowerCase().includes(info))) {
      errors.push('Password cannot contain personal information');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
