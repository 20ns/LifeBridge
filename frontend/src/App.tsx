import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MultiModalInterface from './components/MultiModalInterface';
import LanguageSelector from './components/LanguageSelector';
import { Heart, Settings, Info, Activity } from 'lucide-react';

function App() {  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'optimized'>('optimized');
  const [showPerformanceTooltip, setShowPerformanceTooltip] = useState(false);
  const [showMedicalContextTooltip, setShowMedicalContextTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, right: 0 });
  const [medicalTooltipPosition, setMedicalTooltipPosition] = useState({ top: 0, right: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const medicalTooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const medicalInfoButtonRef = useRef<HTMLButtonElement>(null);


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
      
      // Close medical context tooltip
      if (showMedicalContextTooltip && 
          medicalTooltipRef.current && 
          medicalInfoButtonRef.current &&
          !medicalTooltipRef.current.contains(event.target as Node) &&
          !medicalInfoButtonRef.current.contains(event.target as Node)) {
        setShowMedicalContextTooltip(false);
      }
    };

    if (showPerformanceTooltip || showMedicalContextTooltip) {
      document.addEventListener('mousedown', closeTooltips);
      
      return () => {
        document.removeEventListener('mousedown', closeTooltips);
      };
    }
  }, [showPerformanceTooltip, showMedicalContextTooltip]);return (
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
            <Heart className="logo-icon" />
            <h1>LifeBridge AI</h1>
            <p className="subtitle">Medical Translation Platform</p>
          </div>          <nav className="header-controls" id="navigation" role="navigation" aria-label="Main navigation">
            <div className="language-section">
              <LanguageSelector
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                onSourceChange={setSourceLanguage}
                onTargetChange={setTargetLanguage}
              />
              
              <button 
                ref={medicalInfoButtonRef}
                className="medical-info-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  
                  // Calculate tooltip position relative to button
                  if (medicalInfoButtonRef.current) {
                    const buttonRect = medicalInfoButtonRef.current.getBoundingClientRect();
                    const tooltipWidth = 400;
                    const newPosition = {
                      top: buttonRect.bottom + 8,
                      right: window.innerWidth - (buttonRect.left + buttonRect.width/2 + tooltipWidth/2)
                    };
                    setMedicalTooltipPosition(newPosition);
                  }
                  
                  setShowMedicalContextTooltip(prevState => !prevState);
                }}
                title="Medical Context Information"
                style={{
                  marginLeft: '8px',
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <Activity size={14} style={{ color: '#6b7280' }} />
              </button>
            </div><div className="performance-toggle">
              <button
                className={`performance-btn ${performanceMode === 'optimized' ? 'active' : ''}`}
                onClick={() => setPerformanceMode(performanceMode === 'optimized' ? 'standard' : 'optimized')}
                title="Toggle Performance Mode"
              >
                <Settings size={16} />
                {performanceMode === 'optimized' ? 'Optimized' : 'Standard'}
              </button>              <button 
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
                title="Performance Mode Information"
              >
                <Info size={14} />
              </button>
            </div>
          </nav>        </div>
      </header>

      <main className="main-content" id="main-content" role="main">
        <MultiModalInterface
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onLanguageSwitch={handleLanguageSwitch}
          performanceMode={performanceMode}        />
      </main>      {/* Performance Mode Tooltip - Positioned dynamically outside all containers */}
      {showPerformanceTooltip && (
        <div
          className="performance-tooltip"
          ref={tooltipRef}
          onClick={(e) => e.stopPropagation()}
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
          }}></div>
          
          <div className="tooltip-header">
            <h4>Performance Modes</h4>
            <button
              className="tooltip-close"
              onClick={() => setShowPerformanceTooltip(false)}
            >
              ×
            </button>
          </div>
          <div className="tooltip-content">
            <div className="mode-comparison">
              <div className="mode-section optimized">
                <div className="mode-title">
                  <span className="mode-indicator optimized"></span>
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
                  <span className="mode-indicator standard"></span>
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
          </div>        </div>
      )}

      {/* Medical Context Tooltip */}
      {showMedicalContextTooltip && (
        <div
          className="performance-tooltip"
          ref={medicalTooltipRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${medicalTooltipPosition.top}px`,
            right: `${medicalTooltipPosition.right}px`,
            zIndex: 999999,
            width: '400px',
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
          }}></div>
          
          <div className="tooltip-header">
            <h4>Medical Context Types</h4>
            <button
              className="tooltip-close"
              onClick={() => setShowMedicalContextTooltip(false)}
            >
              ×
            </button>
          </div>
          <div className="tooltip-content">
            <div className="medical-context-explanation">
              <div className="context-item emergency">
                <div className="context-title">
                  <span className="context-indicator emergency">🚨</span>
                  <strong>Emergency</strong>
                </div>
                <p>Critical care situations requiring immediate attention. Uses priority processing with fastest AI responses for life-threatening scenarios.</p>
              </div>
              
              <div className="context-item consultation">
                <div className="context-title">
                  <span className="context-indicator consultation">🩺</span>
                  <strong>Consultation</strong>
                </div>
                <p>Patient examination and diagnosis discussions. Optimized for precise medical terminology and professional communication.</p>
              </div>
              
              <div className="context-item medication">
                <div className="context-title">
                  <span className="context-indicator medication">💊</span>
                  <strong>Medication</strong>
                </div>
                <p>Prescription instructions and drug-related information. Enhanced accuracy for dosages, drug names, and safety warnings.</p>
              </div>
              
              <div className="context-item general">
                <div className="context-title">
                  <span className="context-indicator general">👥</span>
                  <strong>General</strong>
                </div>
                <p>General medical communication and information. Balanced processing for routine healthcare conversations.</p>
              </div>
            </div>
            
            <div className="context-note">
              <p><strong>How it works:</strong> LifeBridge automatically detects medical context from your text and applies the appropriate translation strategy for maximum accuracy and safety.</p>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2025 LifeBridge AI - Bridging Communication in Healthcare</p>
          <div className="footer-stats">
            <span>🌍 Multi-Modal</span>
            <span>🚨 Emergency Ready</span>
            <span>⚡ Optimized</span>
            <span>♿ Accessible</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
