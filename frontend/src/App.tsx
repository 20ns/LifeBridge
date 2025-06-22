import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MultiModalInterface from './components/MultiModalInterface';
import LanguageSelector from './components/LanguageSelector';
import { Heart, Settings, Info } from 'lucide-react';

function App() {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'optimized'>('optimized');
  const [showPerformanceTooltip, setShowPerformanceTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);


  // Handle language switching
  const handleLanguageSwitch = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  };

  useEffect(() => {
    // This function will be called when a click happens anywhere on the page
    const closeTooltip = () => {
      setShowPerformanceTooltip(false);
    };

    if (showPerformanceTooltip) {
      // Add the listener on the next tick to avoid capturing the click that opened the tooltip
      const timerId = setTimeout(() => {
        document.addEventListener('click', closeTooltip);
      }, 0);

      // Cleanup: remove the listener when the component unmounts or the tooltip closes
      return () => {
        clearTimeout(timerId);
        document.removeEventListener('click', closeTooltip);
      };
    }
  }, [showPerformanceTooltip]);  return (
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
            <LanguageSelector
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onSourceChange={setSourceLanguage}
              onTargetChange={setTargetLanguage}
            />
              <div className="performance-toggle">
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
                  e.stopPropagation(); // Stop this click from being caught by the document listener
                  setShowPerformanceTooltip(prevState => !prevState);
                }}
                title="Performance Mode Information"
              >
                <Info size={14} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Performance Mode Tooltip - Moved outside header for proper positioning */}
      {showPerformanceTooltip && (
        <div
          className="performance-tooltip"
          ref={tooltipRef}
          onClick={(e) => e.stopPropagation()} // Stop clicks inside the tooltip from closing it
        >
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
                  <li>⚡ Sub-2 second emergency translations</li>
                  <li>🧠 Enhanced AI processing for accuracy</li>
                  <li>🚨 Priority processing for medical emergencies</li>
                  <li>📱 Real-time sign language detection</li>
                  <li>🔄 Aggressive caching & pre-loading</li>
                  <li>💰 Higher AWS resource usage</li>
                </ul>
                <p className="mode-use-case">
                  <strong>Best for:</strong> Emergency situations, critical care, ambulances
                </p>
              </div>
              
              <div className="mode-section standard">
                <div className="mode-title">
                  <span className="mode-indicator standard"></span>
                  <strong>Standard Mode</strong>
                </div>
                <ul>
                  <li>🔋 Battery & resource conservation</li>
                  <li>💰 Cost-effective AWS usage</li>
                  <li>⚖️ Balanced speed vs efficiency</li>
                  <li>🌐 Better for limited internet</li>
                  <li>📊 Conservative processing approach</li>
                  <li>⏱️ 5-8 second response times</li>
                </ul>
                <p className="mode-use-case">
                  <strong>Best for:</strong> Routine consultations, long shifts, mobile devices
                </p>
              </div>
            </div>
            
            <div className="aws-info">
              <p><strong>💡 AWS Free Tier Optimized:</strong> Both modes stay within 12-month free tier limits</p>
            </div>
          </div>
        </div>
      )}<main className="main-content" id="main-content" role="main">
        <MultiModalInterface
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onLanguageSwitch={handleLanguageSwitch}
          performanceMode={performanceMode}
        />
      </main>

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
