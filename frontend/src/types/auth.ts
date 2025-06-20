// Authentication types and enums
// Separated to avoid circular dependencies

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

// Role permissions configuration
export const REVIEW_DASHBOARD_ROLES = [
  UserRole.MEDICAL_INTERPRETER,
  UserRole.QA_REVIEWER,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.ADMIN
];

export const ADMIN_PANEL_ROLES = [
  UserRole.ADMIN,
  UserRole.COMPLIANCE_OFFICER
];
