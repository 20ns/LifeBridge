import React, { useState } from 'react';
import './App.css';
import TranslationInterface from './components/TranslationInterface';
import EmergencyPhrases from './components/EmergencyPhrases';
import LanguageSelector from './components/LanguageSelector';
import SignLanguageInterface from './components/SignLanguageInterface';
import { Heart, Globe, Mic, Volume2, Hand } from 'lucide-react';

function App() {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'speech' | 'sign'>('text');
  const [isTranslating, setIsTranslating] = useState(false);

  // Handle translation requests from different interfaces
  const handleTranslationRequest = async (text: string, context: string) => {
    setIsTranslating(true);
    console.log(`Translation requested: "${text}" (context: ${context})`);
    
    try {
      // This would integrate with the existing translation service
      // For now, we'll simulate the translation process
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Translation completed');
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle emergency detection from sign language
  const handleEmergencyDetected = (emergencyText: string) => {
    console.log(`🚨 EMERGENCY DETECTED: ${emergencyText}`);
    // This would trigger emergency protocols
    alert(`EMERGENCY DETECTED: ${emergencyText}`);
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
        <div className="interface-tabs">
          <button
            className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <Globe size={20} />
            Text Translation
          </button>
          <button
            className={`tab-button ${activeTab === 'speech' ? 'active' : ''}`}
            onClick={() => setActiveTab('speech')}
          >
            <Mic size={20} />
            Speech Translation
          </button>
          <button
            className={`tab-button ${activeTab === 'sign' ? 'active' : ''}`}
            onClick={() => setActiveTab('sign')}
          >
            <Hand size={20} />
            Sign Language
          </button>
        </div>

        <div className="interface-content">
          {activeTab === 'text' && (
            <div className="translation-container">
              <TranslationInterface
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            </div>
          )}

          {activeTab === 'speech' && (
            <div className="translation-container">
              <TranslationInterface
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            </div>
          )}

          {activeTab === 'sign' && (
            <div className="sign-language-container">
              <SignLanguageInterface
                onTranslationRequest={handleTranslationRequest}
                onEmergencyDetected={handleEmergencyDetected}
                isTranslating={isTranslating}
                currentLanguage={targetLanguage}
              />
            </div>
          )}
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
            <Hand size={16} />
            <Volume2 size={16} />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
