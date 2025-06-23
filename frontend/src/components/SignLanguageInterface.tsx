import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Hand, Info, Video, VideoOff } from 'lucide-react';
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
  const [showSignTooltip, setShowSignTooltip] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const signTooltipRef = useRef<HTMLDivElement>(null);

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

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showSignTooltip &&
        signTooltipRef.current &&
        !signTooltipRef.current.contains(e.target as Node) &&
        !infoButtonRef.current?.contains(e.target as Node)
      ) {
        setShowSignTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSignTooltip]);

  return (
    <div className="translation-interface">
      <div className="input-section">
        <div className="section-header">
          <h3>Sign Language Input</h3>
          {/* Detection toggle button */}
          <button
            className="performance-info-btn detection-toggle"
            title={isActive ? 'Stop Detection' : 'Start Detection'}
            onClick={isActive ? handleStopDetection : handleStartDetection}
            style={{ marginLeft: 'auto', marginRight: '8px' }}
          >
            {isActive ? <VideoOff size={14} aria-hidden="true" /> : <Video size={14} aria-hidden="true" />}
          </button>

          {/* Info button to show recognised gesture list */}
          <button
            ref={infoButtonRef}
            className="performance-info-btn"
            title="Show recognised gestures"
            onClick={() => setShowSignTooltip((p) => !p)}
          >
            <Info size={12} aria-hidden="true" />
          </button>
        </div>
        {/* Tooltip listing recognised gestures */}
        {showSignTooltip && (
          <div
            ref={signTooltipRef}
            className="performance-tooltip"
            style={{ top: '60px', right: '20px', width: '300px', zIndex: 9999 }}
          >
            <div className="tooltip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Recognised Gestures</h4>
              <button className="tooltip-close" onClick={() => setShowSignTooltip(false)}>×</button>
            </div>
            <div className="tooltip-content">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li>✊ <strong>Emergency</strong> – closed fist</li>
                <li>🖐️ <strong>Help</strong> – open palm raised</li>
                <li>🤚 <strong>Pain</strong> – hand to chest</li>
                <li>💊 <strong>Medicine</strong> – pinch fingers</li>
                <li>👨‍⚕️ <strong>Doctor</strong> – index taps wrist</li>
                <li>💧 <strong>Water</strong> – "W" gesture</li>
                <li>👍 <strong>Yes</strong> – thumbs up</li>
                <li>👎 <strong>No</strong> – shake hand side-to-side</li>
              </ul>
            </div>
          </div>
        )}

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
