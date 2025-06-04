import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, Copy, Check } from 'lucide-react';
import { translateText, speakText } from '../services/awsService';

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

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;    setIsTranslating(true);
    try {
      const result = await translateText(inputText, sourceLanguage, targetLanguage, context);
      setTranslatedText(result.translatedText);
      setConfidence(result.confidence);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('Translation failed. Please try again.');
      setConfidence(null);
    } finally {
      setIsTranslating(false);
    }
  };

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

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = sourceLanguage;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };  // Auto-translate when input changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText.trim() && inputText.length > 2) {
        handleTranslate();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputText, sourceLanguage, targetLanguage]);

  return (
    <div className="translation-interface">
      <div className="translation-card">
        <div className="input-section">          <div className="section-header">
            <h3>Source Text</h3>
            <div className="input-controls">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`mic-button ${isListening ? 'listening' : ''}`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
          </div>

          {/* Medical Context Selector */}
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
          </div>

          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter medical text to translate... (e.g., 'The patient has chest pain')"
            className="text-input"
            rows={4}
          />
          
          <div className="input-actions">
            <button
              onClick={handleTranslate}
              className="translate-button"
              disabled={!inputText.trim() || isTranslating}
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
          </div>
          
          {isListening && (
            <div className="listening-indicator">
              <div className="pulse"></div>
              <span>Listening...</span>
            </div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationInterface;
