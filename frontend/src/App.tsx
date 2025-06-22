import React, { useState } from 'react';
import './App.css';
import TranslationInterface from './components/TranslationInterface';
import EmergencyPhrases from './components/EmergencyPhrases';
import LanguageSelector from './components/LanguageSelector';
import { Heart, Globe, Mic, Volume2 } from 'lucide-react';

function App() {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <Heart className="logo-icon" />
            <h1>LifeBridge AI</h1>
            <p className="subtitle">Medical Translation Platform</p>
          </div>
          <div className="language-controls">
            <LanguageSelector
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onSourceChange={setSourceLanguage}
              onTargetChange={setTargetLanguage}
            />
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="translation-container">
          <TranslationInterface
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            isListening={isListening}
            setIsListening={setIsListening}
          />
        </div>

        <div className="emergency-section">
          <EmergencyPhrases
            targetLanguage={targetLanguage}
          />
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2025 LifeBridge AI - Bridging Communication in Healthcare</p>
          <div className="footer-icons">
            <Globe size={16} />
            <Mic size={16} />
            <Volume2 size={16} />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
