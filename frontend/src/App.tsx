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
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <Heart className="logo-icon" />
            <h1>LifeBridge AI</h1>
            <p className="subtitle">Medical Translation Platform</p>
          </div>
            <div className="header-controls">
            <div className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`}
                onClick={() => setActiveTab('main')}
              >
                <Home size={16} />
                Main App
              </button>
              <button
                className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
                onClick={() => setActiveTab('test')}
              >
                <TestTube size={16} />
                UI Testing
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
              </>
            )}
          </div>
        </div>
      </header>      <main className="main-content">
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
