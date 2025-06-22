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

  const [autoTranslate, setAutoTranslate] = useState(false);
  const [lastTranslationTime, setLastTranslationTime] = useState(0);
  const [showAnimationPlayer, setShowAnimationPlayer] = useState(false);
  const [showGestureGuide, setShowGestureGuide] = useState(false);

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
    if (autoTranslate && currentText && !isTranslating) {
      const now = Date.now();
      if (now - lastTranslationTime > 2000) { // Throttle translations
        const textToTranslate = getTextForTranslation();
        const medicalContext = getMedicalContext();
        
        if (textToTranslate) {
          onTranslationRequest(textToTranslate, medicalContext);
          setLastTranslationTime(now);
        }
      }
    }
  }, [currentText, autoTranslate, isTranslating, lastTranslationTime, getTextForTranslation, getMedicalContext, onTranslationRequest]);

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
        {/* Control buttons */}
        <div className="sign-controls">
          <button
            onClick={isActive ? stopDetection : startDetection}
            className={`sign-btn ${isActive ? 'recording' : ''}`}
          >
            {isActive ? '🤚 Stop Detection' : '👋 Start Detection'}
          </button>
          
          <button
            onClick={clearHistory}
            className="clear-btn"
            disabled={detectedSigns.length === 0}
          >
            Clear History
          </button>
          
          <button
            onClick={() => setShowGestureGuide(true)}
            className="guide-btn"
          >
            📚 Gesture Guide
          </button>
        </div>

        {/* Auto-translate toggle */}
        <div className="auto-translate-toggle">
          <label>
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
            />
            Auto-translate detected text
          </label>
        </div>

        {/* Detection status */}
        <div className="detection-status">
          <span className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? 'Detecting Signs...' : 'Sign Detection Inactive'}
          </span>
          {mlMode && (
            <span className="ml-mode">[{mlMode} mode]</span>
          )}
        </div>

        {/* Main detection area */}
        <div className="detection-area">
          {isActive && (
            <>              <VisualFeedbackSystem
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

        {/* Current text display */}
        {currentText && (
          <div className="current-text">
            <h4>Detected Text:</h4>
            <p>{currentText}</p>
          </div>
        )}

        {/* Translation result */}
        {translatedText && (
          <div className="translation-result">
            <h4>Translation:</h4>
            <p>{translatedText}</p>
            <button
              onClick={() => setShowAnimationPlayer(!showAnimationPlayer)}
              className="show-animation-btn"
            >
              {showAnimationPlayer ? 'Hide Animation' : 'Show Animation'}
            </button>
          </div>
        )}

        {/* Confidence score */}
        {confidenceScore > 0 && (
          <div className="confidence-score">
            <span>Confidence: {Math.round(confidenceScore * 100)}%</span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ width: `${confidenceScore * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent signs */}
        {detectedSigns.length > 0 && (
          <div className="recent-signs">
            <h4>Recent Signs:</h4>
            <div className="signs-list">
              {detectedSigns.slice(-5).reverse().map((sign, index) => (
                <div key={index} className="sign-item">
                  <span>{sign.gesture}</span>
                  <small>{new Date(sign.timestamp).toLocaleTimeString()}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Animation player */}
        {showAnimationPlayer && translatedText && (
          <div className="animation-player">
            <SignAnimationPlayer text={translatedText} />
          </div>
        )}

        {/* Session stats */}
        {detectionStats.totalDetections > 0 && (
          <div className="session-stats">
            <h4>Session Statistics:</h4>
            <div className="stats-grid">
              <div>Total: {detectionStats.totalDetections}</div>
              <div>Avg Confidence: {(detectionStats.avgConfidence * 100).toFixed(1)}%</div>
              <div>Duration: {Math.round(detectionStats.sessionDuration / 1000)}s</div>
            </div>
          </div>
        )}
      </div>

      {/* Gesture Guide Modal */}
      <GestureGuide 
        isVisible={showGestureGuide} 
        onClose={() => setShowGestureGuide(false)} 
      />
    </div>
  );
});

export default SignLanguageInterface;
