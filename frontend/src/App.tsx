import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MultiModalInterface from './components/MultiModalInterface';
import LanguageSelector from './components/LanguageSelector';
import { AriaLiveProvider } from './components/AriaLive';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AppStateProvider } from './contexts/AppStateContext';
import { Heart, Settings, Info } from 'lucide-react';
import './styles/accessibility-enhanced.css';

function App() {  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'optimized'>('optimized');
  const [showPerformanceTooltip, setShowPerformanceTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, right: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);


  // Handle language switching
  const handleLanguageSwitch = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  };  useEffect(() => {
    const closeTooltips = (event: MouseEvent) => {
      // Close performance tooltip
      if (showPerformanceTooltip && 
          tooltipRef.current && 
          infoButtonRef.current &&
          !tooltipRef.current.contains(event.target as Node) &&
          !infoButtonRef.current.contains(event.target as Node)) {
        setShowPerformanceTooltip(false);
      }
    };

    if (showPerformanceTooltip) {
      document.addEventListener('mousedown', closeTooltips);
      
      return () => {
        document.removeEventListener('mousedown', closeTooltips);
      };
    }
  }, [showPerformanceTooltip]);  return (
    <AccessibilityProvider>
      <AppStateProvider>
        <AriaLiveProvider>
          <AppContent />
        </AriaLiveProvider>
      </AppStateProvider>
    </AccessibilityProvider>
  );
}

const AppContent: React.FC = () => {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'optimized'>('optimized');
  const [showPerformanceTooltip, setShowPerformanceTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, right: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Handle language switching
  const handleLanguageSwitch = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  };

  useEffect(() => {
    const closeTooltips = (event: MouseEvent) => {
      // Close performance tooltip
      if (showPerformanceTooltip && 
          tooltipRef.current && 
          infoButtonRef.current &&
          !tooltipRef.current.contains(event.target as Node) &&
          !infoButtonRef.current.contains(event.target as Node)) {
        setShowPerformanceTooltip(false);
      }
    };

    if (showPerformanceTooltip) {
      document.addEventListener('mousedown', closeTooltips);
      
      return () => {
        document.removeEventListener('mousedown', closeTooltips);
      };
    }
  }, [showPerformanceTooltip]);

  return (
    <div className="App">
      {/* Skip Links for Accessibility */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
      </div>

      <header className="app-header" role="banner">
        <div className="header-content">
          <div className="logo-section">
            <img 
              src="/logo.png" 
              alt="LifeBridgeAI Logo" 
              className="logo-image"
              width="40" 
              height="40"
            />
            <h1>LifeBridgeAI</h1>
            <p className="subtitle">Medical Translation Platform</p>
          </div>

          <nav className="header-controls" id="navigation" role="navigation" aria-label="Main navigation">
            <div className="controls-group">
              <div className="language-section">
                <LanguageSelector
                  sourceLanguage={sourceLanguage}
                  targetLanguage={targetLanguage}
                  onSourceChange={setSourceLanguage}
                  onTargetChange={setTargetLanguage}
                />
              </div>

              <div className="performance-toggle">
                <button
                  className={`performance-btn ${performanceMode === 'optimized' ? 'active' : ''}`}
                  onClick={() => setPerformanceMode(performanceMode === 'optimized' ? 'standard' : 'optimized')}
                  aria-label={`Toggle Performance Mode - Currently ${performanceMode}`}
                >
                  <Settings size={16} aria-hidden="true" />
                  <span className="sr-only">Performance Mode: </span>
                  {performanceMode === 'optimized' ? 'Optimized' : 'Standard'}
                </button>

                <button 
                  ref={infoButtonRef}
                  className="performance-info-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // Calculate tooltip position relative to button
                    if (infoButtonRef.current) {
                      const buttonRect = infoButtonRef.current.getBoundingClientRect();
                      const tooltipWidth = 380;
                      const newPosition = {
                        top: buttonRect.bottom + 8, // 8px gap below button
                        right: window.innerWidth - (buttonRect.left + buttonRect.width/2 + tooltipWidth/2) // center tooltip under the icon
                      };
                      setTooltipPosition(newPosition);
                    }
                    
                    setShowPerformanceTooltip(prevState => !prevState);
                  }}
                  aria-label="Performance Mode Information"
                  aria-expanded={showPerformanceTooltip}
                  aria-controls="performance-tooltip"
                >
                  <Info size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main className="main-content" id="main-content" role="main">
        <MultiModalInterface
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onLanguageSwitch={handleLanguageSwitch}
          performanceMode={performanceMode}
        />
      </main>

      {/* Performance Mode Tooltip - Positioned dynamically outside all containers */}
      {showPerformanceTooltip && (
        <div
          id="performance-tooltip"
          className="performance-tooltip"
          ref={tooltipRef}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="tooltip-title"
          aria-describedby="tooltip-content"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            right: `${tooltipPosition.right}px`,
            zIndex: 999999,
            width: '380px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Arrow pointing up to the info button */}
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid white',
            filter: 'drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.1))'
          }} aria-hidden="true"></div>
          
          <div className="tooltip-header">
            <h4 id="tooltip-title">Performance Modes</h4>
            <button
              className="tooltip-close"
              onClick={() => setShowPerformanceTooltip(false)}
              aria-label="Close performance mode information"
            >
              ×
            </button>
          </div>
          <div id="tooltip-content" className="tooltip-content">
            <div className="mode-comparison">
              <div className="mode-section optimized">
                <div className="mode-title">
                  <span className="mode-indicator optimized" aria-hidden="true"></span>
                  <strong>Optimized Mode</strong>
                </div>
                <ul>
                  <li>⚡ Sub-2 second responses</li>
                  <li>🚨 Emergency priority processing</li>
                  <li>📱 Real-time sign language detection</li>
                  <li>💰 Higher resource usage</li>
                </ul>
                <p className="mode-use-case">
                  <strong>Best for:</strong> Emergency situations, critical care
                </p>
              </div>
              
              <div className="mode-section standard">
                <div className="mode-title">
                  <span className="mode-indicator standard" aria-hidden="true"></span>
                  <strong>Standard Mode</strong>
                </div>
                <ul>
                  <li>🔋 Battery conservation</li>
                  <li>💰 Cost-effective usage</li>
                  <li>⚖️ Balanced performance</li>
                  <li>⏱️ 5-8 second responses</li>
                </ul>
                <p className="mode-use-case">
                  <strong>Best for:</strong> Routine consultations, long shifts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <Heart className="footer-logo-icon" aria-hidden="true" />
              <span className="footer-brand-name">LifeBridge</span>
            </div>
            <p className="footer-description">
              Medical translation platform for healthcare communication
            </p>
          </div>
          
          <div className="footer-section footer-capabilities">
            <h4 className="footer-heading">Available Features</h4>
            <div className="capability-grid">
              <span className="capability-item">
                <span className="capability-icon" aria-hidden="true">💬</span>
                Text Translation
              </span>
              <span className="capability-item">
                <span className="capability-icon" aria-hidden="true">🎤</span>
                Speech Recognition
              </span>
              <span className="capability-item">
                <span className="capability-icon" aria-hidden="true">👋</span>
                Sign Language Detection
              </span>
              <span className="capability-item">
                <span className="capability-icon" aria-hidden="true">🚨</span>
                Emergency Phrases
              </span>
            </div>
          </div>
          
          <div className="footer-section footer-info">
            <div className="footer-disclaimer">
              <p className="disclaimer-text">
                This tool assists healthcare communication and should supplement, not replace, professional medical interpretation services.
              </p>
            </div>
            <div className="footer-bottom">
              <p className="footer-copyright">
                © 2025 LifeBridge - Healthcare Communication Platform
              </p>
              <div className="footer-tech">
                <small>Powered by AWS Bedrock</small>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
