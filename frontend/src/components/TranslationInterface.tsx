import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, Copy, Check, Wifi, WifiOff, Mic, Activity, Info, AlertTriangle } from 'lucide-react';
import { translateText, speakText } from '../services/awsService';
import { useRealTimeTranslation } from '../hooks/useRealTimeTranslation';
import { usePerformanceMonitor } from '../utils/performanceMonitor';
import { analyzeMedicalContent, MedicalAnalysis } from '../utils/medicalTerminology';
import SpeechInterface from './SpeechInterface';
import QRecommendations from './QRecommendations';
import './TranslationInterface.css';
import { getCachedTranslation as getLocalCached, putCachedTranslation as putLocalCached } from '../utils/localTranslationCache';

interface TranslationInterfaceProps {
  sourceLanguage: string;
  targetLanguage: string;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  performanceMode: 'standard' | 'optimized';
  medicalContext?: 'emergency' | 'consultation' | 'medication' | 'general';
  trackPerformance?: (operation: string, startTime: number) => void;
}

const TranslationInterface: React.FC<TranslationInterfaceProps> = ({
  sourceLanguage,
  targetLanguage,
  isListening,
  setIsListening,
  performanceMode,
  medicalContext = 'general',
  trackPerformance
}) => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [context, setContext] = useState<'emergency' | 'consultation' | 'medication' | 'general'>(medicalContext);  const [medicalAnalysis, setMedicalAnalysis] = useState<MedicalAnalysis | null>(null);
  const [showMedicalSuggestions, setShowMedicalSuggestions] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [showQRecommendations, setShowQRecommendations] = useState(false);
  const [patientAge, setPatientAge] = useState<number | undefined>(undefined);
  const [vitalSigns, setVitalSigns] = useState<Record<string, number>>({});  const [autoTranslating, setAutoTranslating] = useState(false); // New state for auto-translation feedback
  const [detectedSymptoms, setDetectedSymptoms] = useState<string | null>(null); // Add missing state for symptoms
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevLanguagesRef = useRef({ sourceLanguage, targetLanguage }); // Track previous language values

  // Initialize performance monitoring (silent - for internal metrics only)
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
  });
  // Medical info tooltip state and ref
  const [showMedicalContextTooltip, setShowMedicalContextTooltip] = useState(false);
  const [medicalTooltipPosition, setMedicalTooltipPosition] = useState({ top: 0, left: 0 });
  const medicalInfoButtonRef = useRef<HTMLButtonElement>(null);
  const medicalTooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        medicalTooltipRef.current &&
        !medicalTooltipRef.current.contains(event.target as Node) &&
        medicalInfoButtonRef.current &&
        !medicalInfoButtonRef.current.contains(event.target as Node)
      ) {
        setShowMedicalContextTooltip(false);
      }
    };

    if (showMedicalContextTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMedicalContextTooltip]);

  // Handle input changes with optional real-time translation
  const handleInputChange = (value: string) => {
    setInputText(value);
    
    // Analyze medical content
    handleTextAnalysis(value);
    
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
  }, [lastTranslation, realTimeMode]);  // Auto-translate when languages change if there's existing content
  useEffect(() => {
    const prevLanguages = prevLanguagesRef.current;
    const languagesChanged = 
      prevLanguages.sourceLanguage !== sourceLanguage || 
      prevLanguages.targetLanguage !== targetLanguage;

    // Update the ref with current values
    prevLanguagesRef.current = { sourceLanguage, targetLanguage };

    // Only auto-translate if:
    // 1. Languages actually changed
    // 2. There's text in the input field
    // 3. There's already a translation (user has translated before)
    // 4. We're not currently translating
    // 5. Real-time mode is off (to avoid conflicts)
    // 6. User isn't currently typing
    if (
      languagesChanged &&
      inputText.trim() && 
      translatedText && 
      !isTranslating && 
      !realTimeMode &&
      !isTyping
    ) {
      // Set auto-translating state for UI feedback
      setAutoTranslating(true);
      
      // Add a small delay to avoid rapid successive translations
      const autoTranslateTimeout = setTimeout(async () => {
        try {
          const text = inputText;
          if (!text.trim()) return;

          setIsTranslating(true);
          const result = await translateText(text, sourceLanguage, targetLanguage, context, performanceMode);
          
          setTranslatedText(result.translatedText);
          setConfidence(result.confidence);
          putLocalCached(text, result.translatedText, sourceLanguage, targetLanguage, result.confidence);
        } catch (error) {
          console.error('Auto-translation error:', error);
          setTranslatedText('Auto-translation failed. Please try again.');
          setConfidence(null);
        } finally {
          setIsTranslating(false);
          setAutoTranslating(false);
        }
      }, 300);

      return () => {
        clearTimeout(autoTranslateTimeout);
        setAutoTranslating(false);
      };
    }
  }, [sourceLanguage, targetLanguage, inputText, translatedText, isTranslating, realTimeMode, isTyping, context, performanceMode]); // Dependencies are safe now
  const handleTranslate = useCallback(async (textToTranslate?: string) => {
    const startTime = Date.now();
    const text = textToTranslate || inputText;
    if (!text.trim()) return;

    // If offline, try local cache first
    if (!navigator.onLine) {
      const cached = getLocalCached(text, sourceLanguage, targetLanguage);
      if (cached) {
        setTranslatedText(cached.translatedText);
        setConfidence(cached.confidence);
        trackPerformance?.('translation', startTime);
        return;
      }
    }

    // Start performance monitoring for translation
    performanceMonitor.startOperation('translation');
    
    setIsTranslating(true);
    // Removed autoTranslating flag here to avoid duplicate UI during manual translation
    try {
      const result = await translateText(text, sourceLanguage, targetLanguage, context, performanceMode);
      
      // Record successful translation performance
      performanceMonitor.endOperation('translation');
      
      setTranslatedText(result.translatedText);
      setConfidence(result.confidence);
      putLocalCached(text, result.translatedText, sourceLanguage, targetLanguage, result.confidence);
      
      // Update medical analysis from API response if available
      if (result.medicalAnalysis) {
        setMedicalAnalysis({
          containsMedical: result.medicalAnalysis.containsMedical,
          isEmergency: result.medicalAnalysis.isEmergency,
          requiresMedicationAccuracy: result.medicalAnalysis.detectedTerms.some(term => term.category === 'medication'),
          detectedTerms: result.medicalAnalysis.detectedTerms.map(term => ({
            term: term.term,
            category: term.category as any,
            alternatives: [],
            criticality: term.criticality as any
          })),
          recommendedContext: result.medicalAnalysis.recommendedContext,
          criticalityScore: result.medicalAnalysis.criticalityScore,
          modifierContext: result.medicalAnalysis.modifierContext
        });
        
        // Show medical suggestions based on API analysis
        setShowMedicalSuggestions(result.medicalAnalysis.containsMedical && result.medicalAnalysis.criticalityScore > 30);
      } else {
        // Fallback to local analysis if API doesn't provide it
        const analysis = analyzeMedicalContent(text);
        setMedicalAnalysis(analysis);
        setShowMedicalSuggestions(analysis.containsMedical && analysis.criticalityScore > 30);
      }
      
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
      setAutoTranslating(false); // Stop auto-translation feedback
      // Report latency to global performance panel
      trackPerformance?.('translation', startTime);
    }
  }, [inputText, sourceLanguage, targetLanguage, context, performanceMonitor, realTimeMode, trackPerformance]);

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
  }, [inputText, sourceLanguage, targetLanguage, realTimeMode, sendTypingIndicator]);

  // Medical analysis and validation
  const handleTextAnalysis = useCallback((text: string) => {
    if (text.trim()) {
      const analysis = analyzeMedicalContent(text);
      setMedicalAnalysis(analysis);
      
      // Auto-suggest context if different from current
      if (analysis.recommendedContext !== context) {
        console.log(`Recommended context change: ${context} → ${analysis.recommendedContext}`);
      }
      
      // Show medical suggestions for complex terms
      setShowMedicalSuggestions(analysis.containsMedical && analysis.criticalityScore > 30);
    } else {
      setMedicalAnalysis(null);
      setShowMedicalSuggestions(false);
    }
  }, [context]);

  // Update context when medicalContext prop changes
  useEffect(() => {
    setContext(medicalContext);
  }, [medicalContext]);

  return (
    <div className="interface-container translation-interface">      {/* Top Controls Bar - Medical Context and Settings */}
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
          
          <button 
            ref={medicalInfoButtonRef}
            className="medical-info-btn"            onClick={(e) => {
              e.stopPropagation();
              
              // Calculate tooltip position relative to button and screen
              if (medicalInfoButtonRef.current) {
                const buttonRect = medicalInfoButtonRef.current.getBoundingClientRect();
                const tooltipWidth = 350; // Made smaller for conciseness
                const screenWidth = window.innerWidth;
                
                // Position to the right of the button with a small gap
                let leftPosition = buttonRect.right + 8;
                
                // If tooltip would go off right edge, position it to the left of button
                if (leftPosition + tooltipWidth > screenWidth - 10) {
                  leftPosition = buttonRect.left - tooltipWidth - 8;
                }
                
                // If still off screen, center it and position below
                if (leftPosition < 10) {
                  leftPosition = Math.max(10, buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2);
                }
                
                const topPosition = buttonRect.top + buttonRect.height / 2 - 50; // Center vertically with button
                
                const newPosition = {
                  top: Math.max(10, topPosition),
                  left: leftPosition
                };
                setMedicalTooltipPosition(newPosition);
              }
              
              setShowMedicalContextTooltip(prevState => !prevState);
            }}
            title="Medical Context Information"
            style={{
              marginLeft: '8px',
              padding: '6px',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              color: '#6b7280'
            }}
          >
            <Activity size={16} />
          </button>
        </div>
        
        <div className="top-controls-actions">
          <div className="realtime-toggle">
            <button
              onClick={() => setRealTimeMode(!realTimeMode)}
              className={`realtime-button ${realTimeMode ? 'active' : ''}`}
              title={realTimeMode ? 'Disable real-time translation' : 'Enable real-time translation'}
            >              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {realTimeMode ? 'Real-time ON' : 'Real-time OFF'}
            </button>
          </div>
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
      </div>      <div className="translation-card">
        {/* Main Translation Layout */}
        <div className="translation-layout">
          {/* Input Section */}          <div className="input-section">
            <div className="section-header">
              <h3>Source Text</h3>
              {/* Removed redundant start-recording button; recording is handled in Speech section */}
            </div>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter medical text to translate..."
              className="translation-input"
              rows={4}
            />

            {/* Medical Analysis Display */}
            {medicalAnalysis && (
              <div className="medical-analysis-panel">
                <div className="analysis-header">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Medical Analysis</span>
                </div>
                
                <div className="analysis-content">
                  {medicalAnalysis.isEmergency && (
                    <div className="emergency-alert">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700 font-medium">Emergency content detected</span>
                    </div>
                  )}
                    <div className="analysis-metrics">
                    <div className="metric">
                      <span className="metric-label">Context:</span>
                      <span className={`metric-value context-${medicalAnalysis.recommendedContext}`}>
                        {medicalAnalysis.recommendedContext}
                      </span>
                    </div>
                    
                    {medicalAnalysis.modifierContext !== 'neutral' && (
                      <div className="metric">
                        <span className="metric-label">Condition Type:</span>
                        <span className={`metric-value modifier-${medicalAnalysis.modifierContext}`}>
                          {medicalAnalysis.modifierContext}
                        </span>
                      </div>
                    )}
                    
                    <div className="metric">
                      <span className="metric-label">Criticality:</span>
                      <div className="criticality-bar">
                        <div 
                          className="criticality-fill"
                          style={{ width: `${medicalAnalysis.criticalityScore}%` }}
                        ></div>
                      </div>
                      <span className="metric-value">{medicalAnalysis.criticalityScore}/100</span>
                    </div>
                  </div>
                  
                  {medicalAnalysis.detectedTerms.length > 0 && (
                    <div className="detected-terms">
                      <span className="terms-label">Medical terms detected:</span>
                      <div className="terms-list">
                        {medicalAnalysis.detectedTerms.slice(0, 3).map((term, index) => (
                          <span key={index} className={`term-badge ${term.criticality}`}>
                            {term.term}
                          </span>
                        ))}
                        {medicalAnalysis.detectedTerms.length > 3 && (
                          <span className="more-terms">+{medicalAnalysis.detectedTerms.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}            <div className="input-actions">
              <button
                onClick={() => handleTranslate()}
                className="translate-button"
                disabled={!inputText.trim() || isTranslating || autoTranslating || (realTimeMode && isRealTimeTranslating)}
              >
                {isTranslating || autoTranslating || (realTimeMode && isRealTimeTranslating) 
                  ? (autoTranslating ? 'Auto-translating...' : 'Translating...') 
                  : 'Translate'}
              </button>
            </div>
            
            {/* Auto-translation status indicator */}
            {autoTranslating && (
              <div className="auto-translate-status">
                <div className="pulse"></div>
                <span>Auto-translating to new language...</span>
              </div>
            )}
            
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
      </div>      {/* Emergency Quick Actions */}
      {context === 'emergency' && (
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
            vitalSigns={Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined}          />        </div>      )}      {/* Medical Context Tooltip */}
      {showMedicalContextTooltip && (
        <div
          className="medical-context-tooltip"
          ref={medicalTooltipRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${medicalTooltipPosition.top}px`,
            left: `${medicalTooltipPosition.left}px`,
            zIndex: 999999,
            width: '350px',
            maxWidth: '90vw',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Arrow pointing to the medical info button */}
          <div 
            style={{
              position: 'absolute',
              top: '50px', // Center vertically
              left: medicalInfoButtonRef.current && 
                    medicalTooltipPosition.left > (medicalInfoButtonRef.current.getBoundingClientRect().right + 8) ? 
                    '-8px' : 'auto', // Left arrow if tooltip is to the right
              right: medicalInfoButtonRef.current && 
                     medicalTooltipPosition.left < (medicalInfoButtonRef.current.getBoundingClientRect().left - 8) ? 
                     '-8px' : 'auto', // Right arrow if tooltip is to the left
              transform: 'translateY(-50%)',
              width: '0',
              height: '0',
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: medicalTooltipPosition.left > (medicalInfoButtonRef.current?.getBoundingClientRect().right || 0) ? 
                          '8px solid white' : 'none',
              borderLeft: medicalTooltipPosition.left < (medicalInfoButtonRef.current?.getBoundingClientRect().left || 0) ? 
                         '8px solid white' : 'none',
              filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.1))'
            }}
          />
          
          <div className="tooltip-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 16px 8px',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              Medical Context Types
            </h4>
            <button
              className="tooltip-close"
              onClick={() => setShowMedicalContextTooltip(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px',
                color: '#6b7280',
                borderRadius: '2px'
              }}
            >
              ×
            </button>
          </div>
          
          <div className="tooltip-content" style={{ padding: '12px 16px' }}>
            <div className="medical-context-explanation">
              <div className="context-item" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px', fontSize: '14px' }}>🚨</span>
                  <strong style={{ color: '#dc2626', fontSize: '13px' }}>Emergency</strong>
                </div>
                <p style={{ margin: '0', fontSize: '12px', color: '#4b5563', lineHeight: '1.3' }}>
                  Critical situations with priority processing and fastest responses.
                </p>
              </div>
              
              <div className="context-item" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px', fontSize: '14px' }}>🩺</span>
                  <strong style={{ color: '#059669', fontSize: '13px' }}>Consultation</strong>
                </div>
                <p style={{ margin: '0', fontSize: '12px', color: '#4b5563', lineHeight: '1.3' }}>
                  Patient examination with precise medical terminology.
                </p>
              </div>
              
              <div className="context-item" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px', fontSize: '14px' }}>💊</span>
                  <strong style={{ color: '#7c3aed', fontSize: '13px' }}>Medication</strong>
                </div>
                <p style={{ margin: '0', fontSize: '12px', color: '#4b5563', lineHeight: '1.3' }}>
                  Enhanced accuracy for drug names, dosages, and safety warnings.
                </p>
              </div>
              
              <div className="context-item" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px', fontSize: '14px' }}>👥</span>
                  <strong style={{ color: '#0f766e', fontSize: '13px' }}>General</strong>
                </div>
                <p style={{ margin: '0', fontSize: '12px', color: '#4b5563', lineHeight: '1.3' }}>
                  Balanced processing for routine healthcare conversations.
                </p>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '4px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0', fontSize: '11px', color: '#374151' }}>
                <strong>Auto-detection:</strong> LifeBridge detects context from your text for optimal translation accuracy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationInterface;
