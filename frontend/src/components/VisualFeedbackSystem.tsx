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

    if (confidence >= 0.8) {
      feedbackType = 'success';
      title = 'Clear Sign Detected';
    } else if (confidence >= 0.6) {
      feedbackType = 'warning';
      title = 'Sign Detected (Low Confidence)';
      message += ` - Please hold steady`;
    } else {
      feedbackType = 'error';
      title = 'Unclear Sign';
      message = 'Please try again with clearer gesture';
    }

    // Emergency priority override
    if (medicalPriority === 'critical') {
      feedbackType = 'error'; // Use error styling for critical priority
      title = '🚨 EMERGENCY SIGN DETECTED';
      message = `URGENT: ${translationText || gesture}`;
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
    
    if (percentage >= 80) colorClass = 'bg-green-500';
    else if (percentage >= 60) colorClass = 'bg-yellow-500';
    
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
    <div className={`visual-feedback-system ${className}`}>
      {/* Audio Toggle */}
      <div className="feedback-controls">
        <button
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={`audio-toggle ${isAudioEnabled ? 'enabled' : 'disabled'}`}
          title={`Audio feedback ${isAudioEnabled ? 'enabled' : 'disabled'}`}
        >
          <Volume2 className="w-4 h-4" />
          <span>{isAudioEnabled ? 'Audio On' : 'Audio Off'}</span>
        </button>
      </div>

      {/* Active Detection Indicator */}
      <div className="detection-status">
        <div className="status-indicator active">
          <div className="pulse-ring"></div>
          <div className="pulse-dot"></div>
        </div>
        <span className="status-text">Watching for signs...</span>
      </div>

      {/* Current Sign Display */}
      {signData && (
        <div className="current-sign-display">
          <div className="sign-info">
            <h4 className="sign-name">{signData.gesture}</h4>
            {signData.translationText && (
              <p className="sign-translation">{signData.translationText}</p>
            )}
          </div>
          {getConfidenceBar(signData.confidence)}
          
          {signData.medicalPriority === 'critical' && (
            <div className="emergency-indicator">
              <AlertCircle className="w-5 h-5" />
              <span>EMERGENCY DETECTED</span>
            </div>
          )}
        </div>
      )}

      {/* Feedback Messages */}
      <div className="feedback-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`feedback-message ${message.type} ${
              message.gesture?.toLowerCase().includes('emergency') ? 'emergency' : ''
            }`}
          >
            <div className="message-content">
              <div className="message-header">
                {getMessageIcon(message.type)}
                <h5 className="message-title">{message.title}</h5>
                <button
                  onClick={() => dismissMessage(message.id)}
                  className="dismiss-btn"
                  aria-label="Dismiss message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="message-text">{message.message}</p>
              
              {message.confidence !== undefined && (
                <div className="message-confidence">
                  {getConfidenceBar(message.confidence)}
                </div>
              )}
              
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Cues */}
      <div className="visual-cues">
        <div className="gesture-hints">
          <h5>Hold gestures steady for best detection:</h5>
          <div className="hint-list">
            <div className="hint-item critical">🚨 Emergency: Closed fist</div>
            <div className="hint-item high">🆘 Help: Open palm wave</div>
            <div className="hint-item high">😣 Pain: Two fingers pointing</div>
            <div className="hint-item medium">👍 Yes: Thumbs up</div>
            <div className="hint-item medium">👎 No: Point down</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualFeedbackSystem;
