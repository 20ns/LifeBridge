// Security utilities and validation for LifeBridge medical translation
export interface SecurityConfig {
  enableCSP: boolean;
  enableXSSProtection: boolean;
  enableInputSanitization: boolean;
  maxInputLength: number;
  allowedCharacters: RegExp;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

export interface SecurityReport {
  timestamp: string;
  inputValidationAttempts: number;
  blockedRequests: number;
  sanitizedInputs: number;
  securityScore: number;
  recommendations: string[];
}

class SecurityManager {
  private config: SecurityConfig;
  private requestHistory: Map<string, number[]>;
  private validationAttempts: number;
  private blockedRequests: number;
  private sanitizedInputs: number;

  constructor() {
    this.config = {
      enableCSP: true,
      enableXSSProtection: true,
      enableInputSanitization: true,
      maxInputLength: 5000, // Max characters for medical text
      allowedCharacters: /^[a-zA-Z0-9\s\-.,;:!?()'"áéíóúñü¿¡àèìòùç]+$/i, // Medical text characters
      rateLimitRequests: 100, // Max requests per window
      rateLimitWindow: 60000 // 1 minute window
    };
    
    this.requestHistory = new Map();
    this.validationAttempts = 0;
    this.blockedRequests = 0;
    this.sanitizedInputs = 0;

    // Set up Content Security Policy
    if (this.config.enableCSP) {
      this.setupCSP();
    }
  }

  // Setup Content Security Policy
  private setupCSP(): void {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Needed for React
      "style-src 'self' 'unsafe-inline'", // Needed for styled components
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://*.amazonaws.com https://*.execute-api.*.amazonaws.com",
      "worker-src 'self' blob:",
      "child-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    document.head.appendChild(meta);
  }

  // Validate and sanitize medical text input
  sanitizeInput(input: string, context: 'medical' | 'general' = 'general'): string {
    this.validationAttempts++;

    if (!input || typeof input !== 'string') {
      return '';
    }

    // Check length limits
    if (input.length > this.config.maxInputLength) {
      console.warn('Input exceeds maximum length, truncating');
      input = input.substring(0, this.config.maxInputLength);
      this.sanitizedInputs++;
    }

    // Remove potentially dangerous content
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:(?!image\/)/gi, ''); // Remove non-image data URIs

    // For medical context, be more strict
    if (context === 'medical') {
      // Only allow medical-safe characters
      if (!this.config.allowedCharacters.test(sanitized)) {
        console.warn('Input contains potentially unsafe characters for medical context');
        sanitized = sanitized.replace(/[^\w\s\-.,;:!?()'"áéíóúñü¿¡àèìòùç]/gi, '');
        this.sanitizedInputs++;
      }
    }

    // Basic XSS prevention
    if (this.config.enableXSSProtection) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    return sanitized.trim();
  }

  // Rate limiting check
  checkRateLimit(clientId: string = 'default'): boolean {
    const now = Date.now();
    const requests = this.requestHistory.get(clientId) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => 
      now - time < this.config.rateLimitWindow
    );
    
    if (recentRequests.length >= this.config.rateLimitRequests) {
      this.blockedRequests++;
      console.warn(`Rate limit exceeded for client: ${clientId}`);
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requestHistory.set(clientId, recentRequests);
    
    return true;
  }

  // Validate medical translation request
  validateTranslationRequest(request: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    context?: string;
  }): { isValid: boolean; sanitizedRequest?: any; errors: string[] } {
    const errors: string[] = [];
    
    // Validate required fields
    if (!request.text) {
      errors.push('Text is required');
    }
    
    if (!request.sourceLanguage || !request.targetLanguage) {
      errors.push('Source and target languages are required');
    }

    // Validate language codes
    const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ar', 'ru', 'pt', 'hi', 'ja'];
    if (request.sourceLanguage && !validLanguages.includes(request.sourceLanguage)) {
      errors.push('Invalid source language');
    }
    
    if (request.targetLanguage && !validLanguages.includes(request.targetLanguage)) {
      errors.push('Invalid target language');
    }

    // Validate context
    const validContexts = ['emergency', 'consultation', 'medication', 'general'];
    if (request.context && !validContexts.includes(request.context)) {
      errors.push('Invalid context');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Sanitize the request
    const sanitizedRequest = {
      text: this.sanitizeInput(request.text, 'medical'),
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      context: request.context || 'general'
    };

    return { isValid: true, sanitizedRequest, errors: [] };
  }

  // Check for potential medical data in text
  checkForPHI(text: string): { containsPHI: boolean; details: string[] } {
    const phiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, description: 'Social Security Number' },
      { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, description: 'Credit Card Number' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, description: 'Email Address' },
      { pattern: /\b\d{10}\b|\b\d{3}-\d{3}-\d{4}\b/, description: 'Phone Number' },
      { pattern: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/, description: 'Date (MM/DD/YYYY)' },
      { pattern: /\bMR#?\s*\d+\b/i, description: 'Medical Record Number' },
      { pattern: /\bDOB\s*:?\s*\d{1,2}\/\d{1,2}\/\d{4}\b/i, description: 'Date of Birth' }
    ];

    const detectedPHI: string[] = [];
    
    for (const { pattern, description } of phiPatterns) {
      if (pattern.test(text)) {
        detectedPHI.push(description);
      }
    }

    return {
      containsPHI: detectedPHI.length > 0,
      details: detectedPHI
    };
  }

  // Generate security report
  generateSecurityReport(): SecurityReport {
    const securityScore = this.calculateSecurityScore();
    const recommendations = this.getSecurityRecommendations();

    return {
      timestamp: new Date().toISOString(),
      inputValidationAttempts: this.validationAttempts,
      blockedRequests: this.blockedRequests,
      sanitizedInputs: this.sanitizedInputs,
      securityScore,
      recommendations
    };
  }

  // Calculate security score (0-100)
  private calculateSecurityScore(): number {
    let score = 100;

    // Deduct points for blocked requests (could indicate attacks)
    if (this.blockedRequests > 0) {
      score -= Math.min(this.blockedRequests * 2, 30);
    }

    // Deduct points for sanitized inputs (indicates potential issues)
    if (this.sanitizedInputs > 0) {
      score -= Math.min(this.sanitizedInputs, 20);
    }

    // Bonus points for having security features enabled
    if (this.config.enableCSP) score += 5;
    if (this.config.enableXSSProtection) score += 5;
    if (this.config.enableInputSanitization) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // Get security recommendations
  private getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.blockedRequests > 10) {
      recommendations.push('High number of blocked requests detected - consider implementing additional DDoS protection');
    }

    if (this.sanitizedInputs > 20) {
      recommendations.push('Many inputs required sanitization - review input validation on client side');
    }

    if (!this.config.enableCSP) {
      recommendations.push('Content Security Policy is disabled - enable for better XSS protection');
    }

    if (this.config.rateLimitRequests > 1000) {
      recommendations.push('Rate limit is very high - consider lowering for better protection');
    }

    if (this.validationAttempts > 1000 && this.sanitizedInputs / this.validationAttempts > 0.1) {
      recommendations.push('High ratio of sanitized inputs - review application security practices');
    }

    return recommendations;
  }

  // Reset counters (useful for testing or periodic resets)
  resetCounters(): void {
    this.validationAttempts = 0;
    this.blockedRequests = 0;
    this.sanitizedInputs = 0;
    this.requestHistory.clear();
  }

  // Update security configuration
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Global security manager instance
export const securityManager = new SecurityManager();

// React hook for security features
export const useSecurity = () => {
  return {
    sanitizeInput: securityManager.sanitizeInput.bind(securityManager),
    validateTranslationRequest: securityManager.validateTranslationRequest.bind(securityManager),
    checkRateLimit: securityManager.checkRateLimit.bind(securityManager),
    checkForPHI: securityManager.checkForPHI.bind(securityManager),
    generateSecurityReport: securityManager.generateSecurityReport.bind(securityManager),
    updateConfig: securityManager.updateConfig.bind(securityManager)
  };
};
