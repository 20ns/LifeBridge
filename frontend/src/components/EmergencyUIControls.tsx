import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  Eye, 
  Volume2, 
  Settings, 
  Moon, 
  Sun, 
  Contrast,
  Monitor,
  Smartphone,
  Tablet,
  Maximize
} from 'lucide-react';
import '../styles/emergency-themes.css';

interface EmergencyUIControlsProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'high-contrast') => void;
  onSizeChange?: (size: 'normal' | 'large' | 'extra-large') => void;
  onAccessibilityChange?: (enabled: boolean) => void;
  isEmergencyMode?: boolean;
}

interface ViewportInfo {
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
}

const EmergencyUIControls: React.FC<EmergencyUIControlsProps> = ({
  onThemeChange,
  onSizeChange,
  onAccessibilityChange,
  isEmergencyMode = false
}) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');
  const [currentSize, setCurrentSize] = useState<'normal' | 'large' | 'extra-large'>('normal');
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'landscape'
  });
  
  const controlsRef = useRef<HTMLDivElement>(null);

  // Detect viewport changes for responsive design testing
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (width <= 480) deviceType = 'mobile';
      else if (width <= 768) deviceType = 'tablet';
      
      setViewport({
        width,
        height,
        deviceType,
        orientation: width > height ? 'landscape' : 'portrait'
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);  }, []);

  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'emergency-sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, []);

  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'high-contrast') => {
    setCurrentTheme(theme);
    onThemeChange?.(theme);
    
    // Announce theme change for screen readers
    const announcement = `Theme changed to ${theme} mode`;
    announceToScreenReader(announcement);
  }, [onThemeChange, announceToScreenReader]);

  // Auto-switch to dark mode in emergency situations
  useEffect(() => {
    if (isEmergencyMode) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const emergencyTheme = prefersDark ? 'dark' : 'high-contrast';
      handleThemeChange(emergencyTheme);
    }
  }, [isEmergencyMode, handleThemeChange]);

  // Apply theme to body
  useEffect(() => {
    document.body.className = `emergency-theme-${currentTheme} ${accessibilityMode ? 'accessibility-enhanced' : ''}`;
    
    // Update CSS custom properties based on theme
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.style.setProperty('--emergency-bg', 'var(--emergency-dark-bg)');
      root.style.setProperty('--emergency-text', 'var(--emergency-dark-text)');
    } else if (currentTheme === 'high-contrast') {
      root.style.setProperty('--emergency-bg', 'var(--emergency-contrast-bg)');
      root.style.setProperty('--emergency-text', 'var(--emergency-contrast-text)');
    }  }, [currentTheme, accessibilityMode]);

  const handleSizeChange = (size: 'normal' | 'large' | 'extra-large') => {
    setCurrentSize(size);
    onSizeChange?.(size);
    
    // Apply size classes to body
    document.body.classList.remove('size-normal', 'size-large', 'size-extra-large');
    document.body.classList.add(`size-${size}`);
    
    const announcement = `Text size changed to ${size}`;
    announceToScreenReader(announcement);
  };

  const handleAccessibilityToggle = () => {
    const newMode = !accessibilityMode;
    setAccessibilityMode(newMode);
    onAccessibilityChange?.(newMode);
      const announcement = `Accessibility mode ${newMode ? 'enabled' : 'disabled'}`;
    announceToScreenReader(announcement);
  };

  const getDeviceIcon = () => {
    switch (viewport.deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  // Emergency mode indicator
  const EmergencyIndicator = () => (
    <div className="emergency-status emergency-status-critical">
      <AlertTriangle className="w-4 h-4" />
      <span>EMERGENCY MODE ACTIVE</span>
    </div>
  );

  return (
    <>
      {/* Emergency Mode Indicator */}
      {isEmergencyMode && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <EmergencyIndicator />
        </div>
      )}

      {/* Viewport Information Display */}
      <div className="fixed top-4 right-4 z-40">
        <div className="emergency-card emergency-text-small bg-white/90 backdrop-blur-sm border border-gray-200">
          <div className="emergency-flex gap-4">
            <div className="emergency-flex">
              {getDeviceIcon()}
              <span>{viewport.deviceType}</span>
            </div>
            <div className="emergency-flex">
              <Monitor className="w-4 h-4" />
              <span>{viewport.width}×{viewport.height}</span>
            </div>
            <div className="emergency-flex">
              <Maximize className="w-4 h-4" />
              <span>{viewport.orientation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Controls Button */}
      <button
        className={`fixed bottom-6 right-6 z-50 emergency-btn ${isEmergencyMode ? 'emergency-btn-critical' : 'emergency-btn-primary'} emergency-btn-large rounded-full w-16 h-16 shadow-lg`}
        onClick={() => setShowControls(!showControls)}
        aria-label="Emergency UI Controls"
        aria-expanded={showControls}
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Controls Panel */}
      {showControls && (
        <div 
          ref={controlsRef}
          className="fixed bottom-24 right-6 z-50 emergency-card w-80 max-w-[calc(100vw-3rem)] bg-white/95 backdrop-blur-sm"
          role="dialog"
          aria-label="Emergency UI Controls Panel"
        >
          <div className="emergency-flex-col gap-4">
            <div className="emergency-flex justify-between items-center">
              <h3 className="emergency-heading-3 m-0">UI Controls</h3>
              <button
                className="emergency-btn emergency-btn-secondary p-2"
                onClick={() => setShowControls(false)}
                aria-label="Close controls"
              >
                ×
              </button>
            </div>

            {/* Theme Controls */}
            <div className="emergency-flex-col gap-2">
              <label className="emergency-text-large font-semibold">Theme</label>
              <div className="emergency-grid emergency-grid-3 gap-2">
                <button
                  className={`emergency-btn ${currentTheme === 'light' ? 'emergency-btn-primary' : 'emergency-btn-secondary'} p-3`}
                  onClick={() => handleThemeChange('light')}
                  aria-pressed={currentTheme === 'light'}
                >
                  <Sun className="w-4 h-4" />
                  <span className="emergency-sr-only">Light theme</span>
                </button>
                <button
                  className={`emergency-btn ${currentTheme === 'dark' ? 'emergency-btn-primary' : 'emergency-btn-secondary'} p-3`}
                  onClick={() => handleThemeChange('dark')}
                  aria-pressed={currentTheme === 'dark'}
                >
                  <Moon className="w-4 h-4" />
                  <span className="emergency-sr-only">Dark theme</span>
                </button>
                <button
                  className={`emergency-btn ${currentTheme === 'high-contrast' ? 'emergency-btn-primary' : 'emergency-btn-secondary'} p-3`}
                  onClick={() => handleThemeChange('high-contrast')}
                  aria-pressed={currentTheme === 'high-contrast'}
                >
                  <Contrast className="w-4 h-4" />
                  <span className="emergency-sr-only">High contrast theme</span>
                </button>
              </div>
            </div>

            {/* Size Controls */}
            <div className="emergency-flex-col gap-2">
              <label className="emergency-text-large font-semibold">Text Size</label>
              <div className="emergency-grid emergency-grid-3 gap-2">
                <button
                  className={`emergency-btn ${currentSize === 'normal' ? 'emergency-btn-primary' : 'emergency-btn-secondary'} text-sm`}
                  onClick={() => handleSizeChange('normal')}
                  aria-pressed={currentSize === 'normal'}
                >
                  Normal
                </button>
                <button
                  className={`emergency-btn ${currentSize === 'large' ? 'emergency-btn-primary' : 'emergency-btn-secondary'} text-base`}
                  onClick={() => handleSizeChange('large')}
                  aria-pressed={currentSize === 'large'}
                >
                  Large
                </button>
                <button
                  className={`emergency-btn ${currentSize === 'extra-large' ? 'emergency-btn-primary' : 'emergency-btn-secondary'} text-lg`}
                  onClick={() => handleSizeChange('extra-large')}
                  aria-pressed={currentSize === 'extra-large'}
                >
                  X-Large
                </button>
              </div>
            </div>

            {/* Accessibility Toggle */}
            <div className="emergency-flex justify-between items-center">
              <label className="emergency-text-large font-semibold">Enhanced Accessibility</label>
              <button
                className={`emergency-btn ${accessibilityMode ? 'emergency-btn-urgent' : 'emergency-btn-secondary'} p-3`}
                onClick={handleAccessibilityToggle}
                aria-pressed={accessibilityMode}
                aria-label={`Enhanced accessibility ${accessibilityMode ? 'enabled' : 'disabled'}`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Emergency Actions */}
            <div className="emergency-flex-col gap-2 pt-2 border-t border-gray-200">
              <label className="emergency-text-large font-semibold text-red-600">Emergency Actions</label>
              <div className="emergency-grid emergency-grid-2 gap-2">
                <button
                  className="emergency-btn emergency-btn-critical"
                  onClick={() => window.location.href = 'tel:911'}
                >
                  <Phone className="w-4 h-4" />
                  Call 911
                </button>
                <button
                  className="emergency-btn emergency-btn-urgent"
                  onClick={() => {
                    if ('speechSynthesis' in window) {
                      const utterance = new SpeechSynthesisUtterance('Emergency: Medical assistance needed immediately');
                      utterance.rate = 0.8;
                      utterance.volume = 1;
                      speechSynthesis.speak(utterance);
                    }
                  }}
                >
                  <Volume2 className="w-4 h-4" />
                  Emergency Alert
                </button>
              </div>
            </div>

            {/* Current Settings Display */}
            <div className="emergency-text-small text-gray-600 pt-2 border-t border-gray-200">
              <div>Theme: {currentTheme}</div>
              <div>Size: {currentSize}</div>
              <div>Device: {viewport.deviceType} ({viewport.width}×{viewport.height})</div>
              <div>Accessibility: {accessibilityMode ? 'Enhanced' : 'Standard'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="emergency-sr-only" />
    </>
  );
};

export default EmergencyUIControls;
