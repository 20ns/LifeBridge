// PHI (Protected Health Information) redaction service for HIPAA compliance
// Automatically detects and redacts sensitive medical information

export interface PHIPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'identifier' | 'demographic' | 'medical' | 'financial' | 'contact';
}

export interface PHIDetectionResult {
  originalText: string;
  redactedText: string;
  detectedPHI: {
    type: string;
    value: string;
    position: number;
    severity: string;
    category: string;
  }[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresManualReview: boolean;
  complianceScore: number; // 0-1, higher is better
}

export interface RedactionConfig {
  enableRedaction: boolean;
  strictMode: boolean; // More aggressive redaction in strict mode
  preserveEmergencyInfo: boolean; // Keep critical emergency info even if PHI
  auditRedactions: boolean;
  customPatterns: PHIPattern[];
}

class PHIRedactionService {
  private phiPatterns: PHIPattern[];
  private config: RedactionConfig;

  constructor() {
    this.phiPatterns = this.initializePHIPatterns();
    this.config = {
      enableRedaction: true,
      strictMode: false,
      preserveEmergencyInfo: true,
      auditRedactions: true,
      customPatterns: []
    };
  }

  // Initialize comprehensive PHI detection patterns
  private initializePHIPatterns(): PHIPattern[] {
    return [
      // Direct Identifiers (HIPAA Safe Harbor Rule)
      {
        name: 'Social Security Number',
        pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        replacement: '[SSN-REDACTED]',
        severity: 'critical',
        category: 'identifier'
      },
      {
        name: 'Medical Record Number',
        pattern: /\b(MR#?|MRN#?|Medical Record|Patient ID)[:\s]*\d+\b/gi,
        replacement: '[MRN-REDACTED]',
        severity: 'critical',
        category: 'identifier'
      },
      {
        name: 'Phone Number',
        pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        replacement: '[PHONE-REDACTED]',
        severity: 'high',
        category: 'contact'
      },
      {
        name: 'Email Address',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL-REDACTED]',
        severity: 'high',
        category: 'contact'
      },
      {
        name: 'Date of Birth',
        pattern: /\b(DOB|Date of Birth|Born)[:\s]*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/gi,
        replacement: '[DOB-REDACTED]',
        severity: 'critical',
        category: 'demographic'
      },
      {
        name: 'Full Date',
        pattern: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
        replacement: '[DATE-REDACTED]',
        severity: 'medium',
        category: 'demographic'
      },
      {
        name: 'Address Street Number',
        pattern: /\b\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
        replacement: '[ADDRESS-REDACTED]',
        severity: 'high',
        category: 'contact'
      },
      {
        name: 'ZIP Code',
        pattern: /\b\d{5}(?:-\d{4})?\b/g,
        replacement: '[ZIP-REDACTED]',
        severity: 'medium',
        category: 'contact'
      },
      {
        name: 'Credit Card Number',
        pattern: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
        replacement: '[CC-REDACTED]',
        severity: 'critical',
        category: 'financial'
      },
      {
        name: 'Insurance ID',
        pattern: /\b(Insurance|Policy|Member|Subscriber)\s*(ID|Number|#)[:\s]*[A-Za-z0-9]+\b/gi,
        replacement: '[INSURANCE-REDACTED]',
        severity: 'high',
        category: 'financial'
      },

      // Medical-specific identifiers
      {
        name: 'Prescription Number',
        pattern: /\b(Rx|Prescription)\s*(#|Number)[:\s]*[A-Za-z0-9]+\b/gi,
        replacement: '[RX-REDACTED]',
        severity: 'high',
        category: 'medical'
      },
      {
        name: 'Device Serial Number',
        pattern: /\b(Serial|Device|Implant)\s*(#|Number|ID)[:\s]*[A-Za-z0-9\-]+\b/gi,
        replacement: '[DEVICE-REDACTED]',
        severity: 'high',
        category: 'medical'
      },
      {
        name: 'Account Number',
        pattern: /\b(Account|Acct)\s*(#|Number)[:\s]*\d+\b/gi,
        replacement: '[ACCOUNT-REDACTED]',
        severity: 'high',
        category: 'financial'
      },

      // Names and potential identifiers (more aggressive in strict mode)
      {
        name: 'Potential Full Name',
        pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
        replacement: '[NAME-REDACTED]',
        severity: 'medium',
        category: 'identifier'
      },

      // Vehicle identifiers
      {
        name: 'License Plate',
        pattern: /\b[A-Z0-9]{2,8}\b(?=\s*(license|plate|tag))/gi,
        replacement: '[PLATE-REDACTED]',
        severity: 'medium',
        category: 'identifier'
      },

      // URLs that might contain PHI
      {
        name: 'Web URL',
        pattern: /https?:\/\/[^\s]+/g,
        replacement: '[URL-REDACTED]',
        severity: 'low',
        category: 'contact'
      },

      // IP Addresses
      {
        name: 'IP Address',
        pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        replacement: '[IP-REDACTED]',
        severity: 'low',
        category: 'identifier'
      }
    ];
  }

  // Main PHI detection and redaction function
  async detectAndRedactPHI(
    text: string,
    context: 'emergency' | 'general' | 'consultation' | 'medication' = 'general'
  ): Promise<PHIDetectionResult> {
    
    const detectedPHI: PHIDetectionResult['detectedPHI'] = [];
    let redactedText = text;
    let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Apply each PHI pattern
    for (const phiPattern of this.phiPatterns) {
      // Skip name detection in emergency context if preserveEmergencyInfo is enabled
      if (this.config.preserveEmergencyInfo && 
          context === 'emergency' && 
          phiPattern.name === 'Potential Full Name') {
        continue;
      }

      // In non-strict mode, skip less critical patterns for better usability
      if (!this.config.strictMode && 
          phiPattern.severity === 'low' && 
          context === 'emergency') {
        continue;
      }

      const matches = text.match(phiPattern.pattern);
      if (matches) {
        for (const match of matches) {
          const position = text.indexOf(match);
          
          detectedPHI.push({
            type: phiPattern.name,
            value: match,
            position,
            severity: phiPattern.severity,
            category: phiPattern.category
          });

          // Update highest severity
          if (this.getSeverityLevel(phiPattern.severity) > this.getSeverityLevel(highestSeverity)) {
            highestSeverity = phiPattern.severity;
          }

          // Redact the text
          if (this.config.enableRedaction) {
            redactedText = redactedText.replace(new RegExp(this.escapeRegExp(match), 'g'), phiPattern.replacement);
          }
        }
      }
    }

    // Apply custom patterns if any
    for (const customPattern of this.config.customPatterns) {
      const matches = text.match(customPattern.pattern);
      if (matches) {
        for (const match of matches) {
          const position = text.indexOf(match);
          
          detectedPHI.push({
            type: customPattern.name,
            value: match,
            position,
            severity: customPattern.severity,
            category: customPattern.category
          });

          if (this.config.enableRedaction) {
            redactedText = redactedText.replace(new RegExp(this.escapeRegExp(match), 'g'), customPattern.replacement);
          }
        }
      }
    }

    // Calculate risk level and compliance score
    const riskLevel = this.calculateRiskLevel(detectedPHI);
    const requiresManualReview = this.shouldRequireManualReview(detectedPHI, context);
    const complianceScore = this.calculateComplianceScore(detectedPHI, context);

    // Add emergency context preservation warning
    if (context === 'emergency' && detectedPHI.length > 0 && this.config.preserveEmergencyInfo) {
      redactedText += '\n\n[PRIVACY NOTICE: Some identifying information may be preserved for emergency medical care]';
    }

    return {
      originalText: text,
      redactedText,
      detectedPHI,
      riskLevel,
      requiresManualReview,
      complianceScore
    };
  }

  // Safe text processing for translation (auto-redact before translation)
  async prepareTextForTranslation(
    text: string,
    context: 'emergency' | 'general' | 'consultation' | 'medication' = 'general'
  ): Promise<{
    safeText: string;
    hadPHI: boolean;
    redactionMap: Map<string, string>;
    warningMessage?: string;
  }> {
    
    const result = await this.detectAndRedactPHI(text, context);
    const redactionMap = new Map<string, string>();

    // Create mapping for potential restoration after translation
    for (const phi of result.detectedPHI) {
      const placeholder = this.getPlaceholderForPHI(phi.type);
      redactionMap.set(placeholder, phi.value);
    }

    let warningMessage: string | undefined;
    if (result.detectedPHI.length > 0) {
      if (context === 'emergency') {
        warningMessage = 'Protected health information detected. Emergency-critical information preserved.';
      } else {
        warningMessage = 'Protected health information has been redacted for privacy compliance.';
      }
    }

    return {
      safeText: result.redactedText,
      hadPHI: result.detectedPHI.length > 0,
      redactionMap,
      warningMessage
    };
  }

  // Validate text is safe for storage/transmission
  async validateTextSafety(
    text: string,
    context: 'emergency' | 'general' | 'consultation' | 'medication' = 'general'
  ): Promise<{
    isSafe: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    
    const result = await this.detectAndRedactPHI(text, context);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Identify safety issues
    if (result.detectedPHI.length > 0) {
      const criticalPHI = result.detectedPHI.filter(phi => phi.severity === 'critical');
      const highPHI = result.detectedPHI.filter(phi => phi.severity === 'high');

      if (criticalPHI.length > 0) {
        issues.push(`Critical PHI detected: ${criticalPHI.map(p => p.type).join(', ')}`);
        recommendations.push('Immediately redact critical PHI before any processing');
      }

      if (highPHI.length > 0) {
        issues.push(`High-risk PHI detected: ${highPHI.map(p => p.type).join(', ')}`);
        recommendations.push('Consider redacting high-risk PHI for better privacy protection');
      }

      if (context !== 'emergency') {
        recommendations.push('Use automatic redaction before translation in non-emergency contexts');
      }
    }

    const isSafe = result.riskLevel === 'low' || 
                   (context === 'emergency' && result.riskLevel === 'medium');

    return {
      isSafe,
      riskLevel: result.riskLevel,
      issues,
      recommendations
    };
  }

  // Calculate risk level based on detected PHI
  private calculateRiskLevel(detectedPHI: PHIDetectionResult['detectedPHI']): 'low' | 'medium' | 'high' | 'critical' {
    if (detectedPHI.length === 0) return 'low';

    const severityCounts = {
      critical: detectedPHI.filter(p => p.severity === 'critical').length,
      high: detectedPHI.filter(p => p.severity === 'high').length,
      medium: detectedPHI.filter(p => p.severity === 'medium').length,
      low: detectedPHI.filter(p => p.severity === 'low').length
    };

    if (severityCounts.critical > 0) return 'critical';
    if (severityCounts.high >= 2 || (severityCounts.high >= 1 && severityCounts.medium >= 2)) return 'critical';
    if (severityCounts.high >= 1 || severityCounts.medium >= 3) return 'high';
    if (severityCounts.medium >= 1 || severityCounts.low >= 3) return 'medium';
    
    return 'low';
  }

  // Determine if manual review is required
  private shouldRequireManualReview(
    detectedPHI: PHIDetectionResult['detectedPHI'],
    context: string
  ): boolean {
    
    // Always require review for critical PHI
    if (detectedPHI.some(p => p.severity === 'critical')) {
      return true;
    }

    // Require review for multiple high-severity PHI items
    const highSeverityCount = detectedPHI.filter(p => p.severity === 'high').length;
    if (highSeverityCount >= 2) {
      return true;
    }

    // Emergency context has different thresholds
    if (context === 'emergency') {
      // More lenient for emergency - only require review for very high risk
      return detectedPHI.filter(p => p.severity === 'high').length >= 3;
    }

    // For non-emergency, be more strict
    return highSeverityCount >= 1 || detectedPHI.length >= 4;
  }

  // Calculate compliance score (0-1, higher is better)
  private calculateComplianceScore(
    detectedPHI: PHIDetectionResult['detectedPHI'],
    context: string
  ): number {
    let score = 1.0;

    // Deduct points based on PHI severity and count
    const severityPenalties = {
      critical: 0.4,
      high: 0.2,
      medium: 0.1,
      low: 0.05
    };

    for (const phi of detectedPHI) {
      score -= severityPenalties[phi.severity as keyof typeof severityPenalties];
    }

    // Emergency context gets bonus points for life-saving priority
    if (context === 'emergency') {
      score += 0.2;
    }

    // Redaction enabled gets bonus points
    if (this.config.enableRedaction) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Get severity level as number for comparison
  private getSeverityLevel(severity: string): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity as keyof typeof levels] || 0;
  }

  // Get placeholder for specific PHI type
  private getPlaceholderForPHI(phiType: string): string {
    const placeholders: { [key: string]: string } = {
      'Social Security Number': '[SSN-REDACTED]',
      'Medical Record Number': '[MRN-REDACTED]',
      'Phone Number': '[PHONE-REDACTED]',
      'Email Address': '[EMAIL-REDACTED]',
      'Date of Birth': '[DOB-REDACTED]',
      'Full Date': '[DATE-REDACTED]',
      'Address Street Number': '[ADDRESS-REDACTED]',
      'ZIP Code': '[ZIP-REDACTED]',
      'Credit Card Number': '[CC-REDACTED]',
      'Insurance ID': '[INSURANCE-REDACTED]',
      'Prescription Number': '[RX-REDACTED]',
      'Device Serial Number': '[DEVICE-REDACTED]',
      'Account Number': '[ACCOUNT-REDACTED]',
      'Potential Full Name': '[NAME-REDACTED]',
      'License Plate': '[PLATE-REDACTED]',
      'Web URL': '[URL-REDACTED]',
      'IP Address': '[IP-REDACTED]'
    };

    return placeholders[phiType] || '[PHI-REDACTED]';
  }

  // Escape special regex characters
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Update configuration
  updateConfig(newConfig: Partial<RedactionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Add custom PHI pattern
  addCustomPattern(pattern: PHIPattern): void {
    this.config.customPatterns.push(pattern);
  }

  // Remove custom PHI pattern
  removeCustomPattern(patternName: string): void {
    this.config.customPatterns = this.config.customPatterns.filter(
      p => p.name !== patternName
    );
  }

  // Get current configuration
  getConfig(): RedactionConfig {
    return { ...this.config };
  }

  // Get PHI statistics for reporting
  async analyzePHIRisk(text: string): Promise<{
    totalPHIItems: number;
    phiByCategory: { [category: string]: number };
    phiBySeverity: { [severity: string]: number };
    riskAssessment: string;
    complianceRecommendations: string[];
  }> {
    
    const result = await this.detectAndRedactPHI(text);
    
    const phiByCategory: { [category: string]: number } = {};
    const phiBySeverity: { [severity: string]: number } = {};

    for (const phi of result.detectedPHI) {
      phiByCategory[phi.category] = (phiByCategory[phi.category] || 0) + 1;
      phiBySeverity[phi.severity] = (phiBySeverity[phi.severity] || 0) + 1;
    }

    const riskAssessment = this.generateRiskAssessment(result);
    const complianceRecommendations = this.generateComplianceRecommendations(result);

    return {
      totalPHIItems: result.detectedPHI.length,
      phiByCategory,
      phiBySeverity,
      riskAssessment,
      complianceRecommendations
    };
  }

  // Generate risk assessment narrative
  private generateRiskAssessment(result: PHIDetectionResult): string {
    if (result.detectedPHI.length === 0) {
      return 'No PHI detected. Text appears safe for processing and storage.';
    }

    const criticalCount = result.detectedPHI.filter(p => p.severity === 'critical').length;
    const highCount = result.detectedPHI.filter(p => p.severity === 'high').length;

    if (criticalCount > 0) {
      return `Critical privacy risk: ${criticalCount} critical PHI items detected. Immediate redaction required before any processing.`;
    } else if (highCount >= 2) {
      return `High privacy risk: Multiple high-severity PHI items detected. Redaction strongly recommended.`;
    } else if (highCount >= 1) {
      return `Moderate privacy risk: High-severity PHI detected. Consider redaction based on use case.`;
    } else {
      return `Low privacy risk: Minor PHI detected. Standard privacy precautions sufficient.`;
    }
  }

  // Generate compliance recommendations
  private generateComplianceRecommendations(result: PHIDetectionResult): string[] {
    const recommendations: string[] = [];

    if (result.detectedPHI.length === 0) {
      recommendations.push('Text is compliant for processing and storage');
      return recommendations;
    }

    if (result.detectedPHI.some(p => p.severity === 'critical')) {
      recommendations.push('Immediately redact all critical PHI before any processing or storage');
      recommendations.push('Implement strict access controls for this data');
      recommendations.push('Consider data minimization - only collect necessary information');
    }

    if (result.detectedPHI.some(p => p.category === 'identifier')) {
      recommendations.push('Use tokenization or pseudonymization for identifiers where possible');
    }

    if (result.detectedPHI.some(p => p.category === 'medical')) {
      recommendations.push('Ensure medical information handling complies with HIPAA requirements');
    }

    if (result.requiresManualReview) {
      recommendations.push('Manual privacy review required before processing');
    }

    recommendations.push('Audit all PHI access and processing activities');
    recommendations.push('Implement end-to-end encryption for data transmission');
    recommendations.push('Ensure secure deletion of PHI when no longer needed');

    return recommendations;
  }
}

// Export singleton instance
export const phiRedactionService = new PHIRedactionService();

// Helper functions for easy integration
export const detectAndRedactPHI = async (
  text: string,
  context: 'emergency' | 'general' | 'consultation' | 'medication' = 'general'
) => {
  return await phiRedactionService.detectAndRedactPHI(text, context);
};

export const prepareTextForTranslation = async (
  text: string,
  context: 'emergency' | 'general' | 'consultation' | 'medication' = 'general'
) => {
  return await phiRedactionService.prepareTextForTranslation(text, context);
};

export const validateTextSafety = async (
  text: string,
  context: 'emergency' | 'general' | 'consultation' | 'medication' = 'general'
) => {
  return await phiRedactionService.validateTextSafety(text, context);
};
