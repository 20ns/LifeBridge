import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Hand } from 'lucide-react';
import SignLanguageDetector from './SignLanguageDetector';
import SignAnimationPlayer from './SignAnimationPlayer';
import VisualFeedbackSystem from './VisualFeedbackSystem';
import GestureGuide from './GestureGuide';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';
import './TranslationInterface.css'; // Using shared styles

interface SignLanguageInterfaceProps {
  onTranslationRequest: (text: string, context: string) => void;
  onEmergencyDetected: (emergencyText: string) => void;
  isTranslating?: boolean;
  currentLanguage?: string;
  translatedText?: string;
}

export interface SignLanguageInterfaceHandle {
  triggerStartDetection: () => void;
  triggerStopDetection: () => void;
  isDetectionActive: () => boolean;
}

const SignLanguageInterface = forwardRef<SignLanguageInterfaceHandle, SignLanguageInterfaceProps>(({
  onTranslationRequest,
  onEmergencyDetected,
  isTranslating = false,
  currentLanguage = 'en',
  translatedText = ''
}, ref) => {
  const {
    isActive,
    detectedSigns,
    currentText,
    confidenceScore,
    mlMode,
    startDetection,
    stopDetection,
    handleSignDetected,
    clearHistory,
    getTextForTranslation,
    getMedicalContext,
    getDetectionStats,
    isEmergencyDetected
  } = useSignLanguageDetection();
  
  // Alert system state
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  
  const [lastTranslationTime, setLastTranslationTime] = useState(0);

  const prevPropsRef = useRef<SignLanguageInterfaceProps | undefined>(undefined);

  // Alert system functions
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => setAlertMessage(''), 4000); // Auto-hide after 4 seconds
  };

  // Show success alert when translation completes
  useEffect(() => {
    if (translatedText && isTranslating === false) {
      showAlert('✅ Translation completed successfully!', 'success');
    }
  }, [translatedText, isTranslating]);

  // Create feedback data object
  const feedbackData = {
    currentGesture: detectedSigns[detectedSigns.length - 1]?.gesture || '',
    confidence: confidenceScore,
    isEmergency: isEmergencyDetected(),
    translationStatus: isTranslating ? 'translating' : 'ready'
  };
  // Auto-translate when new signs are detected
  useEffect(() => {
    // Removed auto-translate for cleaner UI - translation happens on-demand
  }, [currentText, isTranslating, lastTranslationTime, getTextForTranslation, getMedicalContext, onTranslationRequest]);
  // Emergency detection
  useEffect(() => {
    if (isEmergencyDetected()) {
      const emergencyText = getTextForTranslation();
      showAlert('🚨 Emergency sign detected!', 'error');
      onEmergencyDetected(emergencyText);
    }
  }, [detectedSigns, isEmergencyDetected, getTextForTranslation, onEmergencyDetected]);

  const handleManualTranslate = () => {
    const textToTranslate = getTextForTranslation();
    const medicalContext = getMedicalContext();
    
    if (textToTranslate) {
      showAlert('Translating sign language...', 'info');
      onTranslationRequest(textToTranslate, medicalContext);
      setLastTranslationTime(Date.now());
    } else {
      showAlert('No signs detected to translate', 'warning');
    }
  };

  // Enhanced start/stop detection functions with alerts
  const handleStartDetection = () => {
    startDetection();
    showAlert('Sign language detection started', 'success');
  };

  const handleStopDetection = () => {
    stopDetection();
    showAlert('Sign language detection stopped', 'info');
  };

  const detectionStats = getDetectionStats();
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    triggerStartDetection: () => {
      if (!isActive) {
        handleStartDetection();
      }
    },
    triggerStopDetection: () => {
      if (isActive) {
        handleStopDetection();
      }
    },
    isDetectionActive: () => isActive
  }));return (
    <div className="translation-interface">
      <div className="translation-layout">
        {/* Input Section - Sign Detection */}
        <div className="input-section">        <div className="section-header">
          <h3>Sign Language Input</h3><button
            onClick={isActive ? handleStopDetection : handleStartDetection}
            className={`start-recording-button ${isActive ? 'recording' : ''}`}
            title={isActive ? 'Stop Detection' : 'Start Detection'}
          >
            <Hand size={16} />
            {isActive ? 'Stop Detection' : 'Start Detection'}
          </button>
        </div>

        {/* Main Detection Area */}
        <div className="sign-detection-area">
          {isActive ? (
            <div className="detection-layout">
              <div className="detection-side">
                <SignLanguageDetector
                  onSignDetected={handleSignDetected}
                  isActive={isActive}
                  medicalContext={getMedicalContext()}
                />
              </div>
              <div className="feedback-side">
                <VisualFeedbackSystem
                  signData={{
                    gesture: feedbackData.currentGesture,
                    confidence: feedbackData.confidence,
                    medicalPriority: feedbackData.isEmergency ? 'critical' : 'medium',
                    translationText: translatedText
                  }}
                  isActive={isActive}
                />
              </div>
            </div>
          ) : (
            <div className="waiting-state">
              <Hand size={64} />
              <h3>Sign Language Ready</h3>
              <p>Click "Start Detection" to begin</p>
            </div>
          )}
        </div>

        {/* Status indicators */}
        {isActive && (
          <div className="status-indicators">
            <span className="status-item">
              Gesture: <strong>{feedbackData.currentGesture || 'None'}</strong>
            </span>
            <span className="status-item">
              Confidence: <strong className={`confidence-${confidenceScore > 70 ? 'good' : 'low'}`}>
                {Math.round(confidenceScore)}%
              </strong>
            </span>
            {feedbackData.isEmergency && (
              <span className="emergency-status">🚨 Emergency Detected</span>
            )}
          </div>
        )}

        <div className="input-actions">
          <button
            onClick={handleManualTranslate}
            className="translate-button"
            disabled={!currentText.trim() || isTranslating}
          >
            {isTranslating ? 'Translating...' : 'Translate Signs'}
          </button>
        </div>
      </div>

      {/* Output Section - Translation */}
      <div className="output-section">
        <div className="section-header">
          <h3>Translation</h3>
          <div className="output-controls">
            <button 
              onClick={handleManualTranslate}
              className="control-button"
              title="Retranslate signs"
              disabled={isTranslating || !currentText.trim()}
            >
              {isTranslating ? '...' : '🔄'}
            </button>
          </div>
        </div>
          <div className={`translation-output ${!translatedText ? 'empty' : ''}`}>
          {isTranslating ? (
            <div className="translation-loading">
              <div className="spinner"></div>
              <span>Translating signs...</span>
            </div>
          ) : (
            <p>{translatedText || 'Sign translation will appear here...'}</p>
          )}        </div>
      </div>
    </div>
    
    {/* Alert system */}
    {alertMessage && (
      <div className={`sign-alert ${alertType}`}>
        {alertMessage}
      </div>
    )}
    </div>
  );
});

export default SignLanguageInterface;
