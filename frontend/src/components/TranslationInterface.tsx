import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, Copy, Check, Wifi, WifiOff, AlertTriangle, Mic } from 'lucide-react';
import { translateText, speakText } from '../services/awsService';
import { useRealTimeTranslation } from '../hooks/useRealTimeTranslation';
import { usePerformanceMonitor } from '../utils/performanceMonitor';
import SpeechInterface from './SpeechInterface';
import EmergencyScenarioWorkflow from './EmergencyScenarioWorkflow';
import QRecommendations from './QRecommendations';
import './TranslationInterface.css';

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
}) => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [context, setContext] = useState<'emergency' | 'consultation' | 'medication' | 'general'>('general');  const [realTimeMode, setRealTimeMode] = useState(false);
  const [showEmergencyWorkflow, setShowEmergencyWorkflow] = useState(false);
  const [showQRecommendations, setShowQRecommendations] = useState(true);  const [detectedSymptoms, setDetectedSymptoms] = useState<string>('');
  const [patientAge] = useState<number | undefined>(undefined);
  const [vitalSigns] = useState<{
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  }>({});const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize performance monitoring
  const performanceMonitor = usePerformanceMonitor();

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
  });  // Handle input changes with optional real-time translation
  const handleInputChange = (value: string) => {
    setInputText(value);
    
    // Clear previous translation if user is editing
    if (!realTimeMode && translatedText) {
      setTranslatedText('');
      setConfidence(null);
    }
    
    // Only send typing indicator if real-time mode is enabled
    if (realTimeMode && value.trim()) {
      sendTypingIndicator(value);
    }
  };

  // Update translated text when real-time translation completes
  useEffect(() => {
    if (lastTranslation && realTimeMode) {
      setTranslatedText(lastTranslation.translatedText);
      setConfidence(lastTranslation.confidence);
    }
  }, [lastTranslation, realTimeMode]);  const handleTranslate = useCallback(async (textToTranslate?: string) => {
    const text = textToTranslate || inputText;
    if (!text.trim()) return;

    // Start performance monitoring for translation
    performanceMonitor.startOperation('translation');
    
    setIsTranslating(true);
    try {
      const result = await translateText(text, sourceLanguage, targetLanguage, context);
      
      // Record successful translation performance
      performanceMonitor.endOperation('translation');
      
      setTranslatedText(result.translatedText);
      setConfidence(result.confidence);
      
      // Turn off real-time mode after manual translation to prevent conflicts
      if (realTimeMode && textToTranslate) {
        setRealTimeMode(false);
      }
    } catch (error) {
      console.error('Translation error:', error);
      
      // Record translation error
      performanceMonitor.recordError();
      
      setTranslatedText('Translation failed. Please try again.');
      setConfidence(null);
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLanguage, targetLanguage, context, performanceMonitor, realTimeMode]);

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
  };  const handleSpeak = async () => {
    if (translatedText) {
      // Start performance monitoring for speech synthesis
      performanceMonitor.startOperation('speech');
      
      try {
        await speakText(translatedText, targetLanguage);
        performanceMonitor.endOperation('speech');
      } catch (error) {
        console.error('Text-to-speech failed:', error);
        performanceMonitor.recordError();
        
        // Fallback to browser speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(translatedText);
          utterance.lang = targetLanguage;
          speechSynthesis.speak(utterance);
          performanceMonitor.endOperation('speech');
        }
      }
    }
  };
  // Handle speech-to-text result with medical context
  const handleSpeechToText = (transcript: string, detectedContext?: 'emergency' | 'consultation' | 'medication' | 'general') => {
    setInputText(transcript);
    
    // Auto-update context if detected from speech
    if (detectedContext && detectedContext !== 'general') {
      setContext(detectedContext);
    }
    
    // Extract symptoms and medical indicators from transcript
    const symptomsDetected = extractSymptomsFromText(transcript);
    if (symptomsDetected) {
      setDetectedSymptoms(symptomsDetected);
    }
    
    // Auto-translate the speech result
    if (transcript.trim()) {
      handleTranslate(transcript);
    }
  };

  // Extract symptoms from medical text using simple pattern matching
  const extractSymptomsFromText = (text: string): string => {
    const lowerText = text.toLowerCase();
    const symptomKeywords = [
      'chest pain', 'difficulty breathing', 'shortness of breath', 'fever',
      'nausea', 'vomiting', 'headache', 'dizziness', 'abdominal pain',
      'back pain', 'fatigue', 'weakness', 'unconscious', 'seizure'
    ];
    
    const foundSymptoms = symptomKeywords.filter(symptom => 
      lowerText.includes(symptom)
    );
    
    return foundSymptoms.join(', ');
  };

  // Handle emergency scenario selection
  const handleEmergencyScenario = (scenario: string) => {
    setInputText(scenario);
    setContext('emergency');
    handleTranslate(scenario);
    setShowEmergencyWorkflow(false);
  };
  // Only auto-translate in real-time mode when user explicitly enables it
  useEffect(() => {
    if (!realTimeMode) return;
    
    const timer = setTimeout(() => {
      if (inputText.trim() && inputText.length > 2) {
        // Only use real-time translation when enabled
        sendTypingIndicator(inputText);
      }
    }, 1500); // Increased debounce time

    return () => clearTimeout(timer);
  }, [inputText, sourceLanguage, targetLanguage, realTimeMode, sendTypingIndicator]);  return (
    <div className="interface-container translation-interface">
      {/* Top Controls Bar - Medical Context and Settings */}
      <div className="top-controls-bar">
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
        
        <div className="top-controls-actions">
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

          <button
            onClick={() => setShowEmergencyWorkflow(!showEmergencyWorkflow)}
            className={`emergency-workflow-toggle ${showEmergencyWorkflow ? 'active' : ''}`}
            title="Emergency Scenario Workflow"
          >
            <AlertTriangle size={16} />
            Emergency Workflow
          </button>
        </div>
      </div>

      {/* Speech Recognition Instructions - Positioned outside translation area */}
      <div className="speech-instructions">
        <div className="instructions-header">
          <h4>🎤 Medical Speech Recognition Instructions:</h4>
        </div>
        <div className="instructions-content">
          <span>• Speak medical terms slowly and clearly</span>
          <span>• Spell out medication names if not recognized</span>
          <span>• Use full phrases: "blood pressure is 120 over 80"</span>
        </div>
      </div>

      <div className="translation-card">{/* Emergency Scenario Workflow */}
        {showEmergencyWorkflow && (
          <div className="emergency-workflow-section">
            <EmergencyScenarioWorkflow
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onPhraseSelect={handleEmergencyScenario}
            />
          </div>
        )}        {/* Main Translation Layout */}
        <div className="translation-layout">
          {/* Input Section */}          <div className="input-section">
            <div className="section-header">
              <h3>Source Text</h3>
              <button
                onClick={() => setIsListening(!isListening)}
                className={`start-recording-button ${isListening ? 'recording' : ''}`}
                title={isListening ? 'Stop Recording' : 'Start Recording'}
              >
                <Mic size={16} />
                {isListening ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter medical text to translate..."
              className="translation-input"
              rows={4}
            />

            <div className="input-actions">
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
                )}
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="output-section">
            <div className="section-header">
              <h3>Translation</h3>
              <div className="output-controls">
                {confidence && (
                  <span className="confidence-score">
                    {Math.round(confidence * 100)}%
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
            
            <div className={`translation-output ${!translatedText ? 'empty' : ''}`}>
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
      </div>{/* Emergency Quick Actions */}
      {context === 'emergency' && !showEmergencyWorkflow && (
        <div className="speech-instructions emergency-quick-actions">
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

      {/* Q Recommendations */}
      {showQRecommendations && translatedText && (
        <div className="q-recommendations-section mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              🤖 AI Medical Recommendations
            </h3>
            <button
              onClick={() => setShowQRecommendations(!showQRecommendations)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showQRecommendations ? 'Hide' : 'Show'}
            </button>
          </div>
          
          <QRecommendations
            medicalText={inputText}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            context={context}
            symptoms={detectedSymptoms || undefined}
            patientAge={patientAge}
            vitalSigns={Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined}
          />        </div>
      )}      {/* Performance Monitoring Dashboard */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Performance Monitor</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-2 rounded">
              <div className="text-gray-500">Health Score</div>
              <div className="font-bold text-lg">{performanceMonitor.getHealthScore()}%</div>
            </div>
            <div className="bg-white p-2 rounded">
              <div className="text-gray-500">Avg Translation</div>
              <div className="font-bold">{performanceMonitor.getMetrics().translationLatency}ms</div>
            </div>
            <div className="bg-white p-2 rounded">
              <div className="text-gray-500">Cache Hit Rate</div>
              <div className="font-bold">{(performanceMonitor.getMetrics().cacheHitRate).toFixed(1)}%</div>
            </div>
            <div className="bg-white p-2 rounded">
              <div className="text-gray-500">Error Rate</div>
              <div className="font-bold text-red-600">{(performanceMonitor.getMetrics().errorRate).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationInterface;
