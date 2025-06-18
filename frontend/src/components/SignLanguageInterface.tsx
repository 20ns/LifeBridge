import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
  }));
  return (
    <div className="sign-language-interface-container">
      <div className="sign-language-interface">
        {/* Simple control - just start/stop */}
        <div className="sign-controls">
          <button
            onClick={isActive ? stopDetection : startDetection}
            className={`sign-btn ${isActive ? 'recording' : ''}`}
          >
            {isActive ? '🤚 Stop Detection' : '👋 Start Detection'}
          </button>
        </div>

        {/* Main detection area */}
        <div className="detection-area">
          {isActive && (
            <>
              <VisualFeedbackSystem
                signData={{
                  gesture: feedbackData.currentGesture,
                  confidence: feedbackData.confidence,
                  medicalPriority: feedbackData.isEmergency ? 'critical' : 'medium',
                  translationText: translatedText
                }}
                isActive={isActive}
              />
              <SignLanguageDetector
                onSignDetected={handleSignDetected}
                isActive={isActive}
                medicalContext={getMedicalContext()}
              />
            </>
          )}
          {!isActive && (
            <div className="camera-placeholder">
              <p>Click "Start Detection" to begin sign language recognition</p>
            </div>
          )}
        </div>

        {/* Translation result - only show if we have translated text */}
        {translatedText && (
          <div className="translation-result">
            <h4>Translation:</h4>
            <p>{translatedText}</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default SignLanguageInterface;
