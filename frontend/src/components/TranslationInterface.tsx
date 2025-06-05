import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Volume2, Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { translateText, speakText } from '../services/awsService';
import { useRealTimeTranslation } from '../hooks/useRealTimeTranslation';
import SpeechInterface from './SpeechInterface';

interface TranslationInterfaceProps {
  sourceLanguage: string;
  targetLanguage: string;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

const TranslationInterface: React.FC<TranslationInterfaceProps> = ({
  sourceLanguage,
  targetLanguage,
  isListening,
  setIsListening
}) => {  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [context, setContext] = useState<'emergency' | 'consultation' | 'medication' | 'general'>('general');
  const [realTimeMode, setRealTimeMode] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Emergency quick phrases
  const emergencyPhrases = [
    { id: 1, text: 'Call an ambulance immediately!', icon: '🚑' },
    { id: 2, text: 'Patient is unconscious', icon: '😵' },
    { id: 3, text: 'Severe chest pain', icon: '💔' },
    { id: 4, text: 'Difficulty breathing', icon: '🫁' },
    { id: 5, text: 'Medical emergency', icon: '🚨' },
    { id: 6, text: 'Call for help', icon: '📞' }
  ];

  // Real-time translation hook
  const {
    isConnected,
    isTranslating: isRealTimeTranslating,
    isTyping,
    lastTranslation,
    error: realTimeError,
    sendTypingIndicator
  } = useRealTimeTranslation({
    sourceLanguage,
    targetLanguage,
    context
  });

  // Handle input changes with real-time translation
  const handleInputChange = (value: string) => {
    setInputText(value);
    
    if (realTimeMode && value.trim()) {
      sendTypingIndicator(value);
    }
  };

  // Update translated text when real-time translation completes
  useEffect(() => {
    if (lastTranslation && realTimeMode) {
      setTranslatedText(lastTranslation.translatedText);
      setConfidence(lastTranslation.confidence);
    }  }, [lastTranslation, realTimeMode]);
  
  const handleTranslate = useCallback(async (textToTranslate?: string) => {
    const text = textToTranslate || inputText;
    if (!text.trim()) return;

    setIsTranslating(true);
    try {
      const result = await translateText(text, sourceLanguage, targetLanguage, context);
      setTranslatedText(result.translatedText);
      setConfidence(result.confidence);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('Translation failed. Please try again.');
      setConfidence(null);
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLanguage, targetLanguage, context]);

  const handleCopy = async () => {
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  };
  const handleSpeak = async () => {
    if (translatedText) {
      try {
        await speakText(translatedText, targetLanguage);
      } catch (error) {
        console.error('Text-to-speech failed:', error);
        // Fallback to browser speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(translatedText);
          utterance.lang = targetLanguage;
          speechSynthesis.speak(utterance);
        }
      }
    }
  };
  // Handle speech-to-text result
  const handleSpeechToText = (transcript: string) => {
    setInputText(transcript);
    // Auto-translate the speech result
    if (transcript.trim()) {
      handleTranslate(transcript);
    }
  };  // Auto-translate when input changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText.trim() && inputText.length > 2) {
        handleTranslate();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputText, sourceLanguage, targetLanguage, handleTranslate]);

  return (
    <div className="translation-interface">
      <div className="translation-card">
        <div className="input-section">          <div className="section-header">
            <h3>Source Text</h3>
          </div>

          {/* Speech Interface */}
          <div className="speech-section">
            <SpeechInterface
              language={sourceLanguage}
              onSpeechToText={handleSpeechToText}
              textToSpeak={translatedText}
              className="mb-4"
            />
          </div>{/* Medical Context Selector */}
          <div className="context-selector">
            <label htmlFor="context-select">Medical Context:</label>
            <select 
              id="context-select"
              value={context} 
              onChange={(e) => setContext(e.target.value as any)}
              className="context-select"
            >
              <option value="general">🏥 General Medical</option>
              <option value="emergency">🚨 Emergency/Critical</option>
              <option value="consultation">👨‍⚕️ Patient Consultation</option>
              <option value="medication">💊 Medication/Dosage</option>
            </select>
            
            {/* Real-time Mode Toggle */}
            <div className="realtime-toggle">
              <button
                onClick={() => setRealTimeMode(!realTimeMode)}
                className={`realtime-button ${realTimeMode ? 'active' : ''}`}
                title={realTimeMode ? 'Disable real-time translation' : 'Enable real-time translation'}
              >
                {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                {realTimeMode ? 'Real-time ON' : 'Real-time OFF'}
              </button>
            </div>
          </div>          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter medical text to translate... (e.g., 'The patient has chest pain')"
            className="text-input"
            rows={4}
          />            <div className="input-actions">
            <button
              onClick={() => handleTranslate()}
              className="translate-button"
              disabled={!inputText.trim() || isTranslating || (realTimeMode && isRealTimeTranslating)}
            >
              {isTranslating || (realTimeMode && isRealTimeTranslating) ? 'Translating...' : 'Translate'}
            </button>
          </div>
          
          {/* Status Indicators */}
          {realTimeMode && (
            <div className="status-indicators">
              {isTyping && (
                <div className="typing-indicator">
                  <div className="pulse"></div>
                  <span>Analyzing text...</span>
                </div>
              )}
              {isRealTimeTranslating && (
                <div className="translating-indicator">
                  <div className="pulse"></div>
                  <span>Translating in real-time...</span>
                </div>
              )}
              {realTimeError && (
                <div className="error-indicator">
                  <span>⚠️ {realTimeError}</span>
                </div>
              )}            </div>
          )}
        </div>

        <div className="translation-arrow">
          <Send size={20} />
        </div>

        <div className="output-section">
          <div className="section-header">
            <h3>Translation</h3>
            <div className="output-controls">
              {confidence && (
                <span className="confidence-score">
                  Confidence: {Math.round(confidence * 100)}%
                </span>
              )}
              <button
                onClick={handleCopy}
                className="control-button"
                title="Copy translation"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
              <button
                onClick={handleSpeak}
                className="control-button"
                title="Speak translation"
                disabled={!translatedText}
              >
                <Volume2 size={20} />
              </button>
            </div>
          </div>
          
          <div className="text-output">
            {isTranslating ? (
              <div className="translation-loading">
                <div className="spinner"></div>
                <span>Translating...</span>
              </div>
            ) : (
              <p>{translatedText || 'Translation will appear here...'}</p>
            )}        </div>
      </div>

      {/* Emergency Quick Actions */}
      {context === 'emergency' && (
        <div className="emergency-quick-actions">
          <h4>🚨 Emergency Quick Phrases</h4>
          <div className="emergency-buttons">
            {emergencyPhrases.map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => handleInputChange(phrase.text)}
                className="emergency-button"
                title={`Quick insert: ${phrase.text}`}
              >
                {phrase.icon} {phrase.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default TranslationInterface;
