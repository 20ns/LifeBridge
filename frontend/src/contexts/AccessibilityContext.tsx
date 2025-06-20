import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AccessibilityContextValue {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  screenReader: boolean;
  setReducedMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setLargeText: (value: boolean) => void;
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void;
}

interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  screenReader: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Detect screen reader usage
const detectScreenReader = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for common screen reader indicators
    const hasScreenReader = 
      // Check for screen reader specific APIs
      ('speechSynthesis' in window) ||
      // Check for accessibility tree navigation
      (navigator && navigator.userAgent && (
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver')
      )) ||
      // Check for reduced motion preference as an indicator
      ((window as any).matchMedia && (window as any).matchMedia('(prefers-reduced-motion: reduce)').matches);
      
    return Boolean(hasScreenReader);
  } catch (error) {
    // Fallback if detection fails
    return false;
  }
};

// Detect keyboard navigation
const detectKeyboardNavigation = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  let keyboardUsed = false;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      keyboardUsed = true;
      document.body.classList.add('keyboard-navigation');
    }
  };
  
  const handleMouseDown = () => {
    keyboardUsed = false;
    document.body.classList.remove('keyboard-navigation');
  };
  
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);
  
  return keyboardUsed;
};

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    // Load preferences from localStorage or detect from system
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('accessibility-preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    }
      // Default preferences based on system if available
    if (typeof window !== 'undefined' && (window as any).matchMedia) {
      return {
        reducedMotion: (window as any).matchMedia('(prefers-reduced-motion: reduce)').matches,
        highContrast: (window as any).matchMedia('(prefers-contrast: high)').matches,
        largeText: (window as any).matchMedia('(prefers-reduced-data: reduce)').matches, // Approximation
        keyboardNavigation: false,
        screenReader: detectScreenReader()
      };
    }
    
    // Fallback for SSR
    return {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      keyboardNavigation: false,
      screenReader: false
    };
  });
  // Update localStorage when preferences change
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
    }
  }, [preferences]);  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).matchMedia) return;
    
    const reducedMotionQuery = (window as any).matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = (window as any).matchMedia('(prefers-contrast: high)');
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
    };
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);
    
    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);// Apply accessibility classes to document
  useEffect(() => {
    if (typeof window === 'undefined' || !document.body) return;
    
    const classes = [];
    
    if (preferences.reducedMotion) classes.push('reduced-motion');
    if (preferences.highContrast) classes.push('high-contrast');
    if (preferences.largeText) classes.push('large-text');
    if (preferences.keyboardNavigation) classes.push('keyboard-navigation');
    if (preferences.screenReader) classes.push('screen-reader');
    
    // Clear existing accessibility classes
    document.body.classList.remove(
      'reduced-motion', 
      'high-contrast', 
      'large-text', 
      'keyboard-navigation', 
      'screen-reader'
    );
    
    // Add current classes
    document.body.classList.add(...classes);
  }, [preferences]);  // Detect keyboard navigation
  useEffect(() => {
    if (typeof window === 'undefined' || !document) return;
    
    let keyboardUsed = false;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !keyboardUsed) {
        keyboardUsed = true;
        setPreferences(prev => ({ ...prev, keyboardNavigation: true }));
      }
    };
    
    const handleMouseDown = () => {
      if (keyboardUsed) {
        keyboardUsed = false;
        setPreferences(prev => ({ ...prev, keyboardNavigation: false }));
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const updatePreferences = (newPreferences: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const setReducedMotion = (value: boolean) => {
    setPreferences(prev => ({ ...prev, reducedMotion: value }));
  };

  const setHighContrast = (value: boolean) => {
    setPreferences(prev => ({ ...prev, highContrast: value }));
  };

  const setLargeText = (value: boolean) => {
    setPreferences(prev => ({ ...prev, largeText: value }));
  };

  const contextValue: AccessibilityContextValue = {
    reducedMotion: preferences.reducedMotion,
    highContrast: preferences.highContrast,
    largeText: preferences.largeText,
    keyboardNavigation: preferences.keyboardNavigation,
    screenReader: preferences.screenReader,
    setReducedMotion,
    setHighContrast,
    setLargeText,
    updatePreferences
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;
