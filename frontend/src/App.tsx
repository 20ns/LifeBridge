import React, { useState } from 'react';
import './App.css';
import MultiModalInterface from './components/MultiModalInterface';
import LanguageSelector from './components/LanguageSelector';
import EmergencyUITestPage from './components/EmergencyUITestPage';
import { Heart, Settings, Shield, TestTube, Home } from 'lucide-react';

function App() {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'optimized'>('optimized');
  const [activeTab, setActiveTab] = useState<'main' | 'test'>('main');

  // Handle language switching
  const handleLanguageSwitch = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  };
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
            <Heart className="logo-icon" />
            <h1>LifeBridge AI</h1>
            <p className="subtitle">Medical Translation Platform</p>
          </div>
            <nav className="header-controls" id="navigation" role="navigation" aria-label="Main navigation">
            <div className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`}
                onClick={() => setActiveTab('main')}
                aria-pressed={activeTab === 'main'}
                aria-describedby="main-tab-desc"
              >
                <Home size={16} />
                Main App
                <span id="main-tab-desc" className="sr-only">
                  Access the main medical translation interface
                </span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
                onClick={() => setActiveTab('test')}
                aria-pressed={activeTab === 'test'}
                aria-describedby="test-tab-desc"
              >
                <TestTube size={16} />
                UI Testing
                <span id="test-tab-desc" className="sr-only">
                  Access emergency UI testing and device simulation
                </span>
              </button>
            </div>
            
            {activeTab === 'main' && (
              <>
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
                  </button>
                </div>
              </>            )}
          </nav>
        </div>
      </header>

      <main className="main-content" id="main-content" role="main">
        {activeTab === 'main' ? (
          <>
            <div className="platform-description">
              <div className="description-card">
                <Shield className="desc-icon" />
                <h2>Multi-Modal Medical Translation</h2>
                <p>
                  Seamlessly switch between text, speech, and sign language translation modes. 
                  Optimized for emergency healthcare situations with real-time performance monitoring.
                </p>
              </div>
            </div>

            <MultiModalInterface
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onLanguageSwitch={handleLanguageSwitch}
            />
          </>
        ) : (
          <EmergencyUITestPage />
        )}
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
