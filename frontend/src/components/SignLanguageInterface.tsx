import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Hand } from 'lucide-react';
import SignLanguageDetector from './SignLanguageDetector';
import SignAnimationPlayer from './SignAnimationPlayer';
import VisualFeedbackSystem from './VisualFeedbackSystem';
import GestureGuide from './GestureGuide';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

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
  const [lastTranslationTime, setLastTranslationTime] = useState(0);

  const prevPropsRef = useRef<SignLanguageInterfaceProps | undefined>(undefined);

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
      onEmergencyDetected(emergencyText);
    }
  }, [detectedSigns, isEmergencyDetected, getTextForTranslation, onEmergencyDetected]);

  const handleManualTranslate = () => {
    const textToTranslate = getTextForTranslation();
    const medicalContext = getMedicalContext();
    
    if (textToTranslate) {
      onTranslationRequest(textToTranslate, medicalContext);
      setLastTranslationTime(Date.now());
    }
  };

  const detectionStats = getDetectionStats();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    triggerStartDetection: () => {
      if (!isActive) {
        startDetection();
      }
    },
    triggerStopDetection: () => {
      if (isActive) {
        stopDetection();
      }
    },
    isDetectionActive: () => isActive
  }));  return (
    <div className="sign-interface-wrapper">
      {/* Control Header */}
      <div className="sign-control-bar">
        <button
          onClick={isActive ? stopDetection : startDetection}
          className={`sign-control-btn ${isActive ? 'active' : ''}`}
        >
          {isActive ? '🛑 Stop Detection' : '▶️ Start Detection'}
        </button>
        
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
      </div>

      {/* Main Content */}
      <div className="sign-main-content">
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

      {/* Translation Result */}
      {translatedText && (
        <div className="translation-display">
          <div className="translation-label">Translation:</div>
          <div className="translation-output">{translatedText}</div>
          <button 
            onClick={handleManualTranslate}
            className="retranslate-btn"
            disabled={isTranslating}
          >
            {isTranslating ? '...' : '🔄'}
          </button>
        </div>
      )}
    </div>
  );
});

export default SignLanguageInterface;
