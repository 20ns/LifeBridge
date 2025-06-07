import React, { useState, useEffect } from 'react';
import SignLanguageDetector from './SignLanguageDetector';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

interface SignLanguageInterfaceProps {
  onTranslationRequest: (text: string, context: string) => void;
  onEmergencyDetected: (emergencyText: string) => void;
  isTranslating?: boolean;
  currentLanguage?: string;
}

const SignLanguageInterface: React.FC<SignLanguageInterfaceProps> = ({
  onTranslationRequest,
  onEmergencyDetected,
  isTranslating = false,
  currentLanguage = 'en'
}) => {
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

  // Auto-translate when sign is detected
  useEffect(() => {
    if (autoTranslate && currentText && !isTranslating) {
      const now = Date.now();
      const timeSinceLastTranslation = now - lastTranslationTime;
      
      // Wait at least 3 seconds between auto-translations
      if (timeSinceLastTranslation > 3000) {
        const textToTranslate = getTextForTranslation();
        const medicalContext = getMedicalContext();
        
        if (textToTranslate) {
          onTranslationRequest(textToTranslate, medicalContext);
          setLastTranslationTime(now);
        }
      }
    }
  }, [currentText, autoTranslate, isTranslating, getTextForTranslation, getMedicalContext, onTranslationRequest, lastTranslationTime]);

  // Handle emergency detection
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

  return (
    <div className="sign-language-interface">
      <div className="interface-header">
        <h3>Medical Sign Language Translator</h3>
        <div className="status-indicators">
          <div className={`ml-mode-indicator ${mlMode}`}>
            <span className="indicator-icon">
              {mlMode === 'ml' ? '🤖' : '⚙️'}
            </span>
            <span className="indicator-text">
              {mlMode === 'ml' ? 'Enhanced ML' : 'Basic Mode'}
            </span>
          </div>
        </div>
        <div className="controls">
          <button
            onClick={isActive ? stopDetection : startDetection}
            className={`detection-toggle ${isActive ? 'active' : ''}`}
            disabled={isTranslating}
          >
            {isActive ? '🤚 Stop Detection' : '👋 Start Detection'}
          </button>
          
          <label className="auto-translate-toggle">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              disabled={!isActive}
            />
            Auto-translate
          </label>
        </div>
      </div>

      {isActive && (
        <SignLanguageDetector
          onSignDetected={handleSignDetected}
          isActive={isActive}
          medicalContext={getMedicalContext()}
        />
      )}

      <div className="detection-results">
        {currentText && (
          <div className="current-detection">
            <h4>Current Detection:</h4>
            <div className="detected-text">
              <span className="text">{currentText}</span>
              <span className="confidence">
                {Math.round(confidenceScore * 100)}% confidence
              </span>
              {isEmergencyDetected() && (
                <span className="emergency-badge">⚠️ EMERGENCY</span>
              )}
            </div>
            
            <div className="action-buttons">
              <button
                onClick={handleManualTranslate}
                disabled={isTranslating || !currentText}
                className="translate-btn"
              >
                {isTranslating ? 'Translating...' : `Translate to ${currentLanguage.toUpperCase()}`}
              </button>
              
              <button
                onClick={clearHistory}
                className="clear-btn"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {detectedSigns.length > 0 && (
          <div className="detection-history">
            <h4>Recent Signs:</h4>
            <div className="signs-list">
              {detectedSigns.slice(-5).reverse().map((sign, index) => (
                <div key={index} className="sign-item">
                  <span className="sign-text">{sign.gesture}</span>
                  <span className="sign-time">
                    {new Date(sign.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {detectionStats.totalDetections > 0 && (
          <div className="detection-stats">
            <h4>Session Statistics:</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Signs:</span>
                <span className="stat-value">{detectionStats.totalDetections}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Confidence:</span>
                <span className="stat-value">{(detectionStats.avgConfidence * 100).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Session Duration:</span>
                <span className="stat-value">
                  {Math.round(detectionStats.sessionDuration / 1000)}s
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="usage-tips">
        <h4>Medical Sign Language Tips:</h4>
        <ul>
          <li>🚨 <strong>Emergency:</strong> Make a fist and hold for 2 seconds</li>
          <li>🆘 <strong>Help:</strong> Raise all fingers and wave</li>
          <li>😣 <strong>Pain:</strong> Point with two fingers (index + middle)</li>
          <li>💊 <strong>Medicine:</strong> Thumb + pinky gesture</li>
          <li>👩‍⚕️ <strong>Doctor:</strong> Point upward with index finger</li>
          <li>💧 <strong>Water:</strong> Three fingers (thumb + index + middle)</li>
          <li>✅ <strong>Yes:</strong> Thumbs up</li>
          <li>❌ <strong>No:</strong> Point downward</li>
        </ul>
        <p className="tip-note">
          💡 <strong>Tip:</strong> Hold gestures steady for 2-3 seconds for better detection        </p>
      </div>
    </div>
  );
};

export default SignLanguageInterface;
