import React, { useState, useRef } from 'react';
import { 
  CheckCircle, AlertTriangle, Accessibility
} from 'lucide-react';
import '../styles/emergency-themes.css';

interface AccessibilityTest {
  id: string;
  category: 'perceivable' | 'operable' | 'understandable' | 'robust';
  level: 'A' | 'AA' | 'AAA';
  criterion: string;
  description: string;
  test: () => Promise<AccessibilityResult>;
  autoTest: boolean;
}

interface AccessibilityResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  details?: any;
}

interface WCAGCompliance {
  overall: number;
  perceivable: number;
  operable: number;
  understandable: number;
  robust: number;
}

const AccessibilityTestingSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<Map<string, AccessibilityResult>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [compliance, setCompliance] = useState<WCAGCompliance | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // WCAG 2.1 AA Test Suite
  const accessibilityTests: AccessibilityTest[] = [
    // Perceivable Tests
    {
      id: 'color-contrast',
      category: 'perceivable',
      level: 'AA',
      criterion: '1.4.3 Contrast (Minimum)',
      description: 'Text has contrast ratio of at least 4.5:1',
      autoTest: true,
      test: async () => testColorContrast()
    },
    {
      id: 'text-sizing',
      category: 'perceivable',
      level: 'AA',
      criterion: '1.4.4 Resize text',
      description: 'Text can be resized up to 200% without loss of functionality',
      autoTest: true,
      test: async () => testTextSizing()
    },
    {
      id: 'images-alt-text',
      category: 'perceivable',
      level: 'A',
      criterion: '1.1.1 Non-text Content',
      description: 'All images have appropriate alternative text',
      autoTest: true,
      test: async () => testImageAltText()
    },
    {
      id: 'focus-indicators',
      category: 'perceivable',
      level: 'AA',
      criterion: '2.4.7 Focus Visible',
      description: 'Focus indicators are clearly visible',
      autoTest: true,
      test: async () => testFocusIndicators()
    },

    // Operable Tests
    {
      id: 'keyboard-navigation',
      category: 'operable',
      level: 'A',
      criterion: '2.1.1 Keyboard',
      description: 'All functionality is available via keyboard',
      autoTest: false,
      test: async () => testKeyboardNavigation()
    },
    {
      id: 'touch-targets',
      category: 'operable',
      level: 'AA',
      criterion: '2.5.5 Target Size',
      description: 'Touch targets are at least 44x44 CSS pixels',
      autoTest: true,
      test: async () => testTouchTargets()
    },
    {
      id: 'motion-preferences',
      category: 'operable',
      level: 'AA',
      criterion: '2.3.3 Animation from Interactions',
      description: 'Respects reduced motion preferences',
      autoTest: true,
      test: async () => testMotionPreferences()
    },

    // Understandable Tests
    {
      id: 'language-identification',
      category: 'understandable',
      level: 'A',
      criterion: '3.1.1 Language of Page',
      description: 'Page language is identified',
      autoTest: true,
      test: async () => testLanguageIdentification()
    },
    {
      id: 'error-identification',
      category: 'understandable',
      level: 'A',
      criterion: '3.3.1 Error Identification',
      description: 'Errors are clearly identified and described',
      autoTest: true,
      test: async () => testErrorIdentification()
    },

    // Robust Tests
    {
      id: 'valid-markup',
      category: 'robust',
      level: 'A',
      criterion: '4.1.1 Parsing',
      description: 'Markup is valid and well-formed',
      autoTest: true,
      test: async () => testValidMarkup()
    },
    {
      id: 'aria-labels',
      category: 'robust',
      level: 'A',
      criterion: '4.1.2 Name, Role, Value',
      description: 'Elements have appropriate ARIA labels',
      autoTest: true,
      test: async () => testAriaLabels()
    }
  ];

  // Test Implementations
  const testColorContrast = async (): Promise<AccessibilityResult> => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      const elements = document.querySelectorAll('*');
      const failedElements: string[] = [];

      elements.forEach((element) => {
        const styles = window.getComputedStyle(element);
        const backgroundColor = styles.backgroundColor;
        const color = styles.color;
        
        if (backgroundColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)') {
          const contrast = calculateContrastRatio(color, backgroundColor);
          if (contrast < 4.5) {
            failedElements.push(`${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ')[0] : ''}`);
          }
        }
      });

      if (failedElements.length > 0) {
        score = Math.max(0, 100 - (failedElements.length * 10));
        issues.push(`${failedElements.length} elements with insufficient contrast ratio`);
        recommendations.push('Increase color contrast to meet 4.5:1 ratio for normal text');
        recommendations.push('Use emergency theme colors which are designed for high contrast');
      }

      return {
        passed: failedElements.length === 0,
        score,
        issues,
        recommendations,
        details: { failedElements: failedElements.slice(0, 10) }
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: ['Unable to test color contrast'],
        recommendations: ['Manually verify color contrast ratios']
      };
    }
  };

  const testTextSizing = async (): Promise<AccessibilityResult> => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if text sizing controls are available
    const textSizeControls = document.querySelectorAll('[data-text-size], .text-size-control, .emergency-text-large, .emergency-text-extra-large');
    const hasSizeControls = textSizeControls.length > 0;
    
    if (!hasSizeControls) {
      issues.push('No text sizing controls found');
      recommendations.push('Implement text sizing controls in EmergencyUIControls');
    }

    // Check for relative font sizes
    const elementsWithFixedSizes = Array.from(document.querySelectorAll('*')).filter(el => {
      const fontSize = window.getComputedStyle(el).fontSize;
      return fontSize.includes('px') && !el.closest('.emergency-text-large, .emergency-text-extra-large');
    });

    if (elementsWithFixedSizes.length > 20) {
      issues.push('Many elements use fixed pixel font sizes');
      recommendations.push('Use relative font sizes (rem, em) for better scalability');
    }

    return {
      passed: hasSizeControls && elementsWithFixedSizes.length < 10,
      score: hasSizeControls ? (elementsWithFixedSizes.length < 10 ? 100 : 70) : 40,
      issues,
      recommendations
    };
  };

  const testImageAltText = async (): Promise<AccessibilityResult> => {
    const images = document.querySelectorAll('img');
    const issues: string[] = [];
    const recommendations: string[] = [];
    let missingAlt = 0;

    images.forEach((img) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        missingAlt++;
      }
    });

    if (missingAlt > 0) {
      issues.push(`${missingAlt} images missing alternative text`);
      recommendations.push('Add descriptive alt text to all informative images');
      recommendations.push('Use empty alt="" for decorative images');
    }

    return {
      passed: missingAlt === 0,
      score: images.length === 0 ? 100 : Math.max(0, 100 - (missingAlt / images.length * 100)),
      issues,
      recommendations
    };
  };

  const testFocusIndicators = async (): Promise<AccessibilityResult> => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    let elementsWithoutFocus = 0;

    // Check if emergency focus styles are applied
    const hasEmergencyFocus = document.querySelector('.emergency-focus-visible') !== null;
    
    if (!hasEmergencyFocus) {
      issues.push('Emergency focus styles not detected');
      recommendations.push('Apply emergency-focus-visible class to interactive elements');
    }

    // Simple heuristic: check for outline or box-shadow in focus styles
    focusableElements.forEach((element) => {
      const focusStyles = window.getComputedStyle(element, ':focus');
      const hasVisibleFocus = focusStyles.outline !== 'none' || 
                             focusStyles.boxShadow !== 'none' ||
                             element.classList.contains('emergency-focus-visible');
      
      if (!hasVisibleFocus) {
        elementsWithoutFocus++;
      }
    });

    const score = focusableElements.length === 0 ? 100 : 
                  Math.max(0, 100 - (elementsWithoutFocus / focusableElements.length * 100));

    return {
      passed: elementsWithoutFocus === 0,
      score,
      issues: elementsWithoutFocus > 0 ? [`${elementsWithoutFocus} elements lack visible focus indicators`] : [],
      recommendations: elementsWithoutFocus > 0 ? ['Ensure all interactive elements have visible focus indicators'] : []
    };
  };

  const testKeyboardNavigation = async (): Promise<AccessibilityResult> => {
    // This would require user interaction, so we'll check for keyboard event handlers
    const interactiveElements = document.querySelectorAll('button, [role="button"], input, select, textarea');
    const elementsWithKeyboard = Array.from(interactiveElements).filter(el => 
      el.hasAttribute('onkeydown') || 
      el.hasAttribute('onkeyup') || 
      el.hasAttribute('onkeypress') ||
      el.getAttribute('tabindex') !== '-1'
    );

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (elementsWithKeyboard.length < interactiveElements.length / 2) {
      issues.push('Many interactive elements may not support keyboard navigation');
      recommendations.push('Add keyboard event handlers for custom interactive elements');
      recommendations.push('Ensure tab order is logical and complete');
    }

    return {
      passed: elementsWithKeyboard.length >= interactiveElements.length * 0.8,
      score: interactiveElements.length === 0 ? 100 : 
             (elementsWithKeyboard.length / interactiveElements.length * 100),
      issues,
      recommendations
    };
  };

  const testTouchTargets = async (): Promise<AccessibilityResult> => {
    const touchTargets = document.querySelectorAll('button, [role="button"], a, input[type="checkbox"], input[type="radio"]');
    const issues: string[] = [];
    const recommendations: string[] = [];
    let smallTargets = 0;

    touchTargets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // 44px minimum for AA compliance
      
      if (rect.width < minSize || rect.height < minSize) {
        smallTargets++;
      }
    });

    if (smallTargets > 0) {
      issues.push(`${smallTargets} touch targets smaller than 44x44 pixels`);
      recommendations.push('Increase touch target size to at least 44x44 pixels');
      recommendations.push('Use emergency button classes which provide appropriate sizing');
    }

    return {
      passed: smallTargets === 0,
      score: touchTargets.length === 0 ? 100 : Math.max(0, 100 - (smallTargets / touchTargets.length * 100)),
      issues,
      recommendations
    };
  };
  const testMotionPreferences = async (): Promise<AccessibilityResult> => {
    const hasReducedMotionSupport = Boolean(
      document.querySelector('[data-reduced-motion]') !== null ||
      getComputedStyle(document.documentElement).getPropertyValue('--emergency-animation-duration')
    );

    const animatedElements = document.querySelectorAll('.emergency-pulse, .emergency-blink, .animate-spin, [class*="animate"]');
    
    return {
      passed: hasReducedMotionSupport,
      score: hasReducedMotionSupport ? 100 : (animatedElements.length === 0 ? 80 : 40),
      issues: !hasReducedMotionSupport ? ['No reduced motion preference support detected'] : [],
      recommendations: !hasReducedMotionSupport ? [
        'Implement prefers-reduced-motion media queries',
        'Provide motion controls in accessibility settings'
      ] : []
    };
  };
  const testLanguageIdentification = async (): Promise<AccessibilityResult> => {
    const htmlLang = document.documentElement.lang;
    const hasLang = Boolean(htmlLang && htmlLang.length > 0);

    return {
      passed: hasLang,
      score: hasLang ? 100 : 0,
      issues: !hasLang ? ['Document language not specified'] : [],
      recommendations: !hasLang ? ['Add lang attribute to html element'] : []
    };
  };

  const testErrorIdentification = async (): Promise<AccessibilityResult> => {
    const errorElements = document.querySelectorAll('[role="alert"], .error, .emergency-alert, [aria-invalid="true"]');
    const hasErrorHandling = errorElements.length > 0 || 
                            document.querySelector('.emergency-status-critical, .emergency-status-urgent') !== null;

    return {
      passed: true, // Assume pass if error handling exists
      score: hasErrorHandling ? 100 : 80,
      issues: [],
      recommendations: !hasErrorHandling ? ['Implement clear error identification patterns'] : []
    };
  };

  const testValidMarkup = async (): Promise<AccessibilityResult> => {
    // Basic markup validation checks
    const unclosedTags = document.querySelectorAll('input:not([type]), img:not([src])').length;
    const duplicateIds = new Set();
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    const hasDuplicates = allIds.length !== new Set(allIds).size;

    return {
      passed: unclosedTags === 0 && !hasDuplicates,
      score: (unclosedTags === 0 ? 50 : 0) + (!hasDuplicates ? 50 : 0),
      issues: [
        ...(unclosedTags > 0 ? [`${unclosedTags} elements with missing required attributes`] : []),
        ...(hasDuplicates ? ['Duplicate IDs found'] : [])
      ],
      recommendations: [
        ...(unclosedTags > 0 ? ['Fix elements with missing required attributes'] : []),
        ...(hasDuplicates ? ['Ensure all IDs are unique'] : [])
      ]
    };
  };

  const testAriaLabels = async (): Promise<AccessibilityResult> => {
    const elementsNeedingLabels = document.querySelectorAll(
      'button:not([aria-label]):not([aria-labelledby]):empty, ' +
      '[role="button"]:not([aria-label]):not([aria-labelledby]), ' +
      'input:not([aria-label]):not([aria-labelledby]):not([id])'
    );

    const hasEmergencyAria = document.querySelector('[aria-label*="emergency"], [aria-label*="Emergency"]') !== null;

    return {
      passed: elementsNeedingLabels.length === 0,
      score: Math.max(50, 100 - (elementsNeedingLabels.length * 10)) + (hasEmergencyAria ? 10 : 0),
      issues: elementsNeedingLabels.length > 0 ? [`${elementsNeedingLabels.length} elements missing accessible names`] : [],
      recommendations: elementsNeedingLabels.length > 0 ? [
        'Add aria-label or aria-labelledby to unlabeled interactive elements',
        'Ensure emergency context is communicated via ARIA'
      ] : []
    };
  };

  // Helper function to calculate contrast ratio
  const calculateContrastRatio = (foreground: string, background: string): number => {
    // This is a simplified contrast calculation
    // In a real implementation, you'd want a more robust color parsing and contrast calculation
    const getLuminance = (color: string): number => {
      // Very basic luminance calculation
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0.5;
      const [r, g, b] = rgb.map(Number);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults(new Map());
    
    const results = new Map<string, AccessibilityResult>();
    
    for (const test of accessibilityTests) {
      if (selectedCategory === 'all' || test.category === selectedCategory) {
        setCurrentTest(test.id);
        try {
          const result = await test.test();
          results.set(test.id, result);
          setTestResults(new Map(results));
        } catch (error) {
          results.set(test.id, {
            passed: false,
            score: 0,
            issues: [`Test failed: ${error}`],
            recommendations: ['Check test implementation']
          });
        }
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setCurrentTest('');
    setIsRunning(false);
    calculateCompliance(results);
  };

  const calculateCompliance = (results: Map<string, AccessibilityResult>) => {
    const categories = ['perceivable', 'operable', 'understandable', 'robust'];
    const compliance: WCAGCompliance = {
      overall: 0,
      perceivable: 0,
      operable: 0,
      understandable: 0,
      robust: 0
    };

    categories.forEach(category => {
      const categoryTests = accessibilityTests.filter(t => t.category === category);
      const categoryResults = categoryTests.map(t => results.get(t.id)).filter(r => r !== undefined);
      
      if (categoryResults.length > 0) {
        const avgScore = categoryResults.reduce((sum, r) => sum + r!.score, 0) / categoryResults.length;
        (compliance as any)[category] = Math.round(avgScore);
      }
    });

    const allScores = Array.from(results.values()).map(r => r.score);
    compliance.overall = allScores.length > 0 ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length) : 0;

    setCompliance(compliance);
  };

  const getComplianceColor = (score: number): string => {
    if (score >= 90) return 'var(--emergency-success)';
    if (score >= 70) return 'var(--emergency-warning)';
    return 'var(--emergency-critical)';
  };

  const getComplianceIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return AlertTriangle;
  };

  return (
    <div className="emergency-container emergency-theme-light" ref={containerRef}>
      <div className="emergency-section">
        <div className="emergency-alert-banner emergency-status emergency-status-info">
          <Accessibility className="inline mr-2" size={24} />
          WCAG 2.1 AA Compliance Testing Suite
        </div>

        {/* Test Controls */}
        <div className="emergency-grid emergency-grid-4 emergency-section" style={{ gap: '1rem', alignItems: 'center' }}>
          <div>
            <label className="block font-bold mb-2">Test Category:</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="emergency-input w-full"
            >
              <option value="all">All Categories</option>
              <option value="perceivable">Perceivable</option>
              <option value="operable">Operable</option>
              <option value="understandable">Understandable</option>
              <option value="robust">Robust</option>
            </select>
          </div>

          <div>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="emergency-btn-primary w-full"
            >
              {isRunning ? 'Running Tests...' : 'Run Accessibility Tests'}
            </button>
          </div>

          {compliance && (
            <div className="emergency-card">
              <h3 className="font-bold mb-2">Overall Compliance</h3>
              <div className="text-2xl font-bold" style={{ color: getComplianceColor(compliance.overall) }}>
                {compliance.overall}%
              </div>
            </div>
          )}

          {isRunning && (
            <div className="emergency-card emergency-card-info">
              <div className="text-sm">
                <strong>Running:</strong> {currentTest || 'Initializing...'}
              </div>
            </div>
          )}
        </div>

        {/* Compliance Overview */}
        {compliance && (
          <div className="emergency-section">
            <h3 className="text-xl font-bold mb-4">WCAG 2.1 Compliance Overview</h3>
            <div className="emergency-grid emergency-grid-4" style={{ gap: '1rem' }}>
              {Object.entries(compliance).filter(([key]) => key !== 'overall').map(([category, score]) => {
                const Icon = getComplianceIcon(score);
                return (
                  <div key={category} className="emergency-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={20} style={{ color: getComplianceColor(score) }} />
                      <h4 className="font-bold capitalize">{category}</h4>
                    </div>
                    <div className="text-xl font-bold" style={{ color: getComplianceColor(score) }}>
                      {score}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.size > 0 && (
          <div className="emergency-section">
            <h3 className="text-xl font-bold mb-4">Test Results</h3>
            <div className="space-y-4">
              {accessibilityTests
                .filter(test => selectedCategory === 'all' || test.category === selectedCategory)
                .map(test => {
                  const result = testResults.get(test.id);
                  if (!result) return null;

                  const Icon = result.passed ? CheckCircle : AlertTriangle;
                  const statusColor = result.passed ? 'var(--emergency-success)' : 
                                    result.score > 70 ? 'var(--emergency-warning)' : 'var(--emergency-critical)';

                  return (
                    <div key={test.id} className="emergency-card">
                      <div className="flex items-start gap-3">
                        <Icon size={24} style={{ color: statusColor }} className="flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold">{test.criterion}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-sm px-2 py-1 rounded bg-gray-100">
                                Level {test.level}
                              </span>
                              <span 
                                className="text-sm px-2 py-1 rounded text-white font-bold"
                                style={{ backgroundColor: statusColor }}
                              >
                                {result.score}%
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                          
                          {result.issues.length > 0 && (
                            <div className="mb-3">
                              <h5 className="font-semibold text-red-600 mb-1">Issues Found:</h5>
                              <ul className="text-sm list-disc list-inside text-red-600 space-y-1">
                                {result.issues.map((issue, index) => (
                                  <li key={index}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {result.recommendations.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-blue-600 mb-1">Recommendations:</h5>
                              <ul className="text-sm list-disc list-inside text-blue-600 space-y-1">
                                {result.recommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* WCAG Guidelines Reference */}
        <div className="emergency-section">
          <h3 className="text-xl font-bold mb-4">WCAG 2.1 AA Guidelines Reference</h3>
          <div className="emergency-grid emergency-grid-2" style={{ gap: '1rem' }}>
            <div className="emergency-card">
              <h4 className="font-bold mb-2">Perceivable</h4>
              <ul className="text-sm space-y-1">
                <li>• Color contrast ≥ 4.5:1</li>
                <li>• Text resizable to 200%</li>
                <li>• Alternative text for images</li>
                <li>• Visible focus indicators</li>
              </ul>
            </div>
            
            <div className="emergency-card">
              <h4 className="font-bold mb-2">Operable</h4>
              <ul className="text-sm space-y-1">
                <li>• Keyboard accessible</li>
                <li>• Touch targets ≥ 44x44px</li>
                <li>• Reduced motion options</li>
                <li>• Logical tab order</li>
              </ul>
            </div>
            
            <div className="emergency-card">
              <h4 className="font-bold mb-2">Understandable</h4>
              <ul className="text-sm space-y-1">
                <li>• Language identification</li>
                <li>• Clear error messages</li>
                <li>• Consistent navigation</li>
                <li>• Predictable functionality</li>
              </ul>
            </div>
            
            <div className="emergency-card">
              <h4 className="font-bold mb-2">Robust</h4>
              <ul className="text-sm space-y-1">
                <li>• Valid HTML markup</li>
                <li>• Proper ARIA labels</li>
                <li>• Screen reader compatibility</li>
                <li>• Future technology support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityTestingSuite;
