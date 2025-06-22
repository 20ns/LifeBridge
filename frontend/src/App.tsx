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
    const closeTooltip = (event: MouseEvent) => {
      // Close tooltip if clicking outside of it and outside the info button
      if (showPerformanceTooltip && 
          tooltipRef.current && 
          infoButtonRef.current &&
          !tooltipRef.current.contains(event.target as Node) &&
          !infoButtonRef.current.contains(event.target as Node)) {
        setShowPerformanceTooltip(false);
      }
    };

    if (showPerformanceTooltip) {
      // Add listener immediately for better responsiveness
      document.addEventListener('mousedown', closeTooltip);
      
      return () => {
        document.removeEventListener('mousedown', closeTooltip);
      };
    }
  }, [showPerformanceTooltip]);return (
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
          </div>          <div className="tooltip-content">
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
