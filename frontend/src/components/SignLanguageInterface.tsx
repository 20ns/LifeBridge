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
  addNotification: (message: string) => void;
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
  addNotification,
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
    clearHistory,    getTextForTranslation,
    getMedicalContext,
    getDetectionStats,
    isEmergencyDetected
  } = useSignLanguageDetection();
  
  const [lastTranslationTime, setLastTranslationTime] = useState(0);

  const prevPropsRef = useRef<SignLanguageInterfaceProps | undefined>(undefined);
  // Show success notification when translation completes
  useEffect(() => {
    if (translatedText && isTranslating === false) {
      addNotification('✅ Translation completed successfully!');
    }
  }, [translatedText, isTranslating, addNotification]);

  // Create feedback data object
  const feedbackData = {
    currentGesture: detectedSigns[detectedSigns.length - 1]?.gesture || '',
    confidence: confidenceScore,
    isEmergency: isEmergencyDetected(),
    translationStatus: isTranslating ? 'translating' : 'ready'
  };  // Auto-translate when new signs are detected
  useEffect(() => {
    // Removed auto-translate for cleaner UI - translation happens on-demand
  }, [currentText, isTranslating, lastTranslationTime, getTextForTranslation, getMedicalContext, onTranslationRequest]);

  // Emergency detection
  useEffect(() => {
    if (isEmergencyDetected()) {
      const emergencyText = getTextForTranslation();
      addNotification('🚨 Emergency sign detected!');
      onEmergencyDetected(emergencyText);
    }
  }, [detectedSigns, isEmergencyDetected, getTextForTranslation, onEmergencyDetected, addNotification]);

  // Enhanced start/stop detection functions with notifications
  const handleStartDetection = () => {
    startDetection();
    addNotification('Sign language detection started');
  };

  const handleStopDetection = () => {
    stopDetection();
    addNotification('Sign language detection stopped');
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
  }));

  return (
    <div className="translation-interface">
      <div className="input-section">
        <div className="section-header">
          <h3>Sign Language Input</h3>
        </div>

        {/* Main Detection Area */}
        <div className="sign-detection-area">
          {isActive ? (
            <>
              <div className="visual-feedback-system-compact">
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
              <SignLanguageDetector
                onSignDetected={handleSignDetected}
                isActive={isActive}
                medicalContext={getMedicalContext()}              />
            </>
          ) : (
            <div className="waiting-state">
              <Hand size={64} />
              <h3>Sign Language Ready</h3>
              <p>Use the "Start Detection" button above to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SignLanguageInterface;
