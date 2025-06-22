import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, Volume2 } from 'lucide-react';

interface VisualFeedbackProps {
  signData?: {
    gesture: string;
    confidence: number;
    medicalPriority?: 'critical' | 'high' | 'medium' | 'low';
    translationText?: string;
  };
  isActive: boolean;
  className?: string;
}

interface FeedbackMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
  gesture?: string;
  confidence?: number;
}

const VisualFeedbackSystem: React.FC<VisualFeedbackProps> = ({
  signData,
  isActive,
  className = ''
}) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Process sign detection feedback
  useEffect(() => {
    if (!signData || !isActive) return;

    const { gesture, confidence, medicalPriority, translationText } = signData;
    
    // Determine feedback type based on confidence and priority
    let feedbackType: FeedbackMessage['type'] = 'info';
    let title = 'Sign Detected';
    let message = `Detected: ${gesture}`;

    // For emergency signs, show regardless of confidence
    if (medicalPriority === 'critical') {
      feedbackType = 'error'; // Use error styling for critical priority
      title = '🚨 EMERGENCY SIGN DETECTED';
      message = `URGENT: ${translationText || gesture}`;
    }
    // For non-emergency signs, use confidence thresholds
    else if (confidence >= 0.5) {
      feedbackType = 'success';
      title = 'Clear Sign Detected';
    } else if (confidence >= 0.3) {
      feedbackType = 'warning';
      title = 'Sign Detected (Low Confidence)';
      message += ` - Please hold steady`;
    } else {
      feedbackType = 'error';
      title = 'Unclear Sign';
      message = 'Please try again with clearer gesture';
    }

    const newMessage: FeedbackMessage = {
      id: `sign-${Date.now()}`,
      type: feedbackType,
      title,
      message,
      timestamp: Date.now(),
      autoHide: medicalPriority !== 'critical', // Critical messages don't auto-hide
      duration: medicalPriority === 'critical' ? 10000 : 4000,
      gesture,
      confidence
    };

    setMessages(prev => [newMessage, ...prev.slice(0, 4)]); // Keep max 5 messages

    // Play audio feedback if enabled
    if (isAudioEnabled) {
      playAudioFeedback(feedbackType, gesture, confidence);
    }

  }, [signData, isActive, isAudioEnabled]);

  // Auto-hide messages
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages(prev => 
        prev.filter(msg => 
          !msg.autoHide || 
          (Date.now() - msg.timestamp) < (msg.duration || 4000)
        )
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const playAudioFeedback = (type: FeedbackMessage['type'], gesture: string, confidence: number) => {
    // Create audio cues for different feedback types
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'success') {
      // High confidence success tone
      playTone(audioContext, 800, 0.1, 0.2);
      setTimeout(() => playTone(audioContext, 1000, 0.1, 0.2), 150);
    } else if (type === 'warning') {
      // Medium confidence warning tone
      playTone(audioContext, 600, 0.15, 0.3);
    } else if (type === 'error') {
      // Low confidence or emergency tone
      if (gesture.toLowerCase().includes('emergency')) {
        // Urgent beeping for emergency
        for (let i = 0; i < 3; i++) {
          setTimeout(() => playTone(audioContext, 1200, 0.2, 0.4), i * 300);
        }
      } else {
        // Single low tone for poor detection
        playTone(audioContext, 300, 0.2, 0.4);
      }
    }

    // Speak the feedback if speech synthesis is available
    if ('speechSynthesis' in window && confidence > 0.7) {
      const utterance = new SpeechSynthesisUtterance(
        gesture.toLowerCase().includes('emergency') 
          ? `Emergency sign detected` 
          : `${gesture} detected`
      );
      utterance.volume = 0.3;
      utterance.rate = 1.2;
      speechSynthesis.speak(utterance);
    }
  };

  const playTone = (audioContext: AudioContext, frequency: number, duration: number, volume: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const dismissMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const getMessageIcon = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let colorClass = 'bg-red-500';
    
    if (percentage >= 50) colorClass = 'bg-green-500';
    else if (percentage >= 30) colorClass = 'bg-yellow-500';
    
    return (
      <div className="confidence-display">
        <div className="confidence-label">Confidence: {percentage}%</div>
        <div className="confidence-bar">
          <div 
            className={`confidence-fill ${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (!isActive) {
    return (
      <div className={`visual-feedback-system inactive ${className}`}>
        <div className="inactive-message">
          <Info className="w-5 h-5" />
          <span>Sign language detection is not active</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`visual-feedback-system compact ${className}`} style={{
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: '#f0f0f0', // Light grey background for better visibility
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Only show the latest message or current sign */}
      {messages.length > 0 ? (
        <div
          className={`feedback-message ${messages[0].type}`}
          style={{
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            backgroundColor: messages[0].type === 'error' ? '#ffebee' :
                           messages[0].type === 'warning' ? '#fff8e1' :
                           messages[0].type === 'success' ? '#e8f5e9' : '#e3f2fd'
          }}
        >
          <div className="message-content">
            <div className="message-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {getMessageIcon(messages[0].type)}
                <h5 className="message-title" style={{
                  margin: '0 0 0 8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: messages[0].type === 'error' ? '#f44336' :
                         messages[0].type === 'warning' ? '#ff9800' :
                         messages[0].type === 'success' ? '#4CAF50' : '#2196F3'
                }}>
                  {messages[0].title}
                </h5>
              </div>
              <button
                onClick={() => dismissMessage(messages[0].id)}
                className="dismiss-btn"
                aria-label="Dismiss message"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#666'
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="message-text" style={{ margin: '8px 0 0', fontSize: '0.95rem' }}>
              {messages[0].message}
            </p>
          </div>
        </div>
      ) : signData ? (
        <div className="current-sign-display" style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: '#ffffff',
          borderLeft: signData.medicalPriority === 'critical' ? '3px solid #f44336' : '3px solid #2196F3'
        }}>
          <div className="sign-info" style={{ marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h4 className="sign-name" style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 500,
                color: signData.medicalPriority === 'critical' ? '#f44336' : '#333'
              }}>
                {signData.gesture}
              </h4>
              {signData.medicalPriority === 'critical' && (
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  color: '#f44336',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#ffebee'
                }}>EMERGENCY</span>
              )}
            </div>
            {signData.translationText && (
              <p className="sign-translation" style={{
                margin: '8px 0 0',
                fontSize: '0.95rem',
                color: '#666'
              }}>{signData.translationText}</p>
            )}
          </div>
          {getConfidenceBar(signData.confidence)}
        </div>
      ) : (
        <div className="detection-status" style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '1rem',
          color: '#1a73e8'
        }}>
          <div className="status-indicator" style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            marginRight: '10px',
            animation: 'pulse 1.5s infinite'
          }}></div>
          <span className="status-text">Watching for signs...</span>
        </div>
      )}
    </div>
  );
};

export default VisualFeedbackSystem;
