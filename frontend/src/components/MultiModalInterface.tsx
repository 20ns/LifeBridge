import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageSquare, 
  Mic, 
  Hand, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Monitor,
  Smartphone,
  Signal,
  Zap,
  RotateCcw
} from 'lucide-react';
import TranslationInterface from './TranslationInterface';
import SpeechInterface from './SpeechInterface';
import SignLanguageInterface from './SignLanguageInterface';
import EmergencyPhrasesEnhanced from './EmergencyPhrasesEnhanced';
import './MultiModalInterface.css';

type CommunicationMode = 'text' | 'speech' | 'sign' | 'emergency';

interface ConnectionQuality {
  status: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number;
  strength: number;
  timestamp: number;
}

interface PerformanceMetrics {
  translationLatency: number;
  speechRecognitionLatency: number;
  signDetectionLatency: number;
  cacheHitRate: number;
  offlineMode: boolean;
}

interface MultiModalInterfaceProps {
  sourceLanguage: string;
  targetLanguage: string;
  onLanguageSwitch: () => void;
}

const MultiModalInterface: React.FC<MultiModalInterfaceProps> = ({
  sourceLanguage,
  targetLanguage,
  onLanguageSwitch
}) => {
  // State management
  const [activeMode, setActiveMode] = useState<CommunicationMode>('text');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    status: 'excellent',
    latency: 50,
    strength: 100,
    timestamp: Date.now()
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    translationLatency: 0,
    speechRecognitionLatency: 0,
    signDetectionLatency: 0,
    cacheHitRate: 85,
    offlineMode: false
  });  const [isListening, setIsListening] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [translatedText, setTranslatedText] = useState('');

  // Caching mechanism
  const translationCache = useRef<Map<string, any>>(new Map());
  const performanceTimers = useRef<Map<string, number>>(new Map());

  // Check if device is mobile
  useEffect(() => {
    const checkMobileDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    };

    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  // Monitor connection quality
  useEffect(() => {
    const monitorConnection = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const quality: ConnectionQuality = {
          status: connection.effectiveType === '4g' ? 'excellent' : 
                 connection.effectiveType === '3g' ? 'good' : 
                 connection.effectiveType === '2g' ? 'poor' : 'offline',
          latency: connection.rtt || 50,
          strength: Math.min(100, (connection.downlink || 1) * 20),
          timestamp: Date.now()
        };
        setConnectionQuality(quality);
      }

      // Update offline mode based on navigator.onLine
      setPerformanceMetrics(prev => ({
        ...prev,
        offlineMode: !navigator.onLine
      }));
    };

    monitorConnection();
    const interval = setInterval(monitorConnection, 5000);
    
    window.addEventListener('online', monitorConnection);
    window.addEventListener('offline', monitorConnection);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', monitorConnection);
      window.removeEventListener('offline', monitorConnection);
    };
  }, []);

  // Performance tracking
  const trackPerformance = useCallback((operation: string, startTime: number) => {
    const endTime = Date.now();
    const latency = endTime - startTime;

    setPerformanceMetrics(prev => ({
      ...prev,
      [`${operation}Latency`]: latency
    }));

    // Log performance for optimization
    console.log(`${operation} completed in ${latency}ms`);
  }, []);

  // Cache management
  const getCachedTranslation = useCallback((key: string) => {
    const cached = translationCache.current.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      setPerformanceMetrics(prev => ({
        ...prev,
        cacheHitRate: Math.min(100, prev.cacheHitRate + 1)
      }));
      return cached.data;
    }
    return null;
  }, []);

  const setCachedTranslation = useCallback((key: string, data: any) => {
    translationCache.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  // Emergency mode handler with exit confirmation
  const handleEmergencyMode = useCallback((enable: boolean) => {
    if (!enable && isEmergencyMode) {
      // Show confirmation dialog when trying to exit emergency mode
      const confirmed = window.confirm(
        'Are you sure you want to exit emergency mode?\n\nThis will return you to the normal interface.'
      );
      if (!confirmed) {
        return; // User cancelled, stay in emergency mode
      }
    }
    
    setIsEmergencyMode(enable);
    if (enable) {
      setActiveMode('emergency');
      addNotification('🚨 Emergency mode activated');
    } else {
      setActiveMode('text');
      addNotification('Emergency mode deactivated');
    }
  }, [isEmergencyMode]);

  // Handle clicking on LifeBridge AI text when in emergency mode
  const handleHeaderClick = useCallback(() => {
    if (isEmergencyMode) {
      const confirmed = window.confirm(
        'Are you sure you want to exit emergency mode?\n\nThis will return you to the normal interface.'
      );
      if (confirmed) {
        handleEmergencyMode(false);
      }
    }
  }, [isEmergencyMode, handleEmergencyMode]);

  // Notification system
  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev.slice(-4), message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  }, []);

  // Mode switching with performance tracking
  const handleModeSwitch = useCallback((mode: CommunicationMode) => {
    const startTime = Date.now();
    setActiveMode(mode);
    
    // Stop any active listening when switching modes
    if (mode !== 'speech') {
      setIsListening(false);
    }

    trackPerformance('modeSwitch', startTime);
    addNotification(`Switched to ${mode} mode`);
  }, [trackPerformance, addNotification]);

  // Connection quality indicator
  const ConnectionIndicator = () => (
    <div className={`connection-indicator ${connectionQuality.status}`}>
      {connectionQuality.status === 'offline' ? (
        <WifiOff className="connection-icon" />
      ) : (
        <Wifi className="connection-icon" />
      )}
      <div className="connection-details">
        <span className="connection-status">{connectionQuality.status}</span>
        <span className="connection-latency">{connectionQuality.latency}ms</span>
      </div>
    </div>
  );

  // Performance panel
  const PerformancePanel = () => (
    <div className={`performance-panel ${showPerformancePanel ? 'visible' : 'hidden'}`}>
      <div className="performance-header">
        <Monitor className="performance-icon" />
        <span>Performance Metrics</span>
        <button onClick={() => setShowPerformancePanel(false)}>×</button>
      </div>
      <div className="performance-metrics">
        <div className="metric">
          <Zap className="metric-icon" />
          <span>Translation: {performanceMetrics.translationLatency}ms</span>
        </div>
        <div className="metric">
          <Mic className="metric-icon" />
          <span>Speech: {performanceMetrics.speechRecognitionLatency}ms</span>
        </div>
        <div className="metric">
          <Hand className="metric-icon" />
          <span>Sign: {performanceMetrics.signDetectionLatency}ms</span>
        </div>
        <div className="metric">
          <Signal className="metric-icon" />
          <span>Cache Hit: {performanceMetrics.cacheHitRate}%</span>
        </div>
        {performanceMetrics.offlineMode && (
          <div className="metric offline">
            <WifiOff className="metric-icon" />
            <span>Offline Mode Active</span>
          </div>
        )}
      </div>
    </div>
  );

  // Offline fallback message
  const OfflineFallback = () => (
    <div className="offline-fallback">
      <WifiOff className="offline-icon" />
      <div className="offline-content">
        <h3>Connection Lost</h3>
        <p>Using cached translations and offline features</p>
        <button onClick={() => window.location.reload()}>
          <RotateCcw className="button-icon" />
          Retry Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className={`multi-modal-interface ${isEmergencyMode ? 'emergency-mode' : ''} ${isMobileDevice ? 'mobile-device' : ''}`}>
      {/* Header with connection and performance indicators */}
      <div className="interface-header">
        <div className="header-left">
          <ConnectionIndicator />
          {isMobileDevice && <Smartphone className="device-indicator" />}
        </div>
        
        <div className="header-center">
          <h2 onClick={handleHeaderClick} style={{ cursor: isEmergencyMode ? 'pointer' : 'default' }}>
            LifeBridge Communication
          </h2>
        </div>
        
        <div className="header-right">
          <button 
            className="performance-toggle"
            onClick={() => setShowPerformancePanel(!showPerformancePanel)}
            title="Performance Metrics"
          >
            <Monitor />
          </button>
          <button 
            className={`emergency-toggle ${isEmergencyMode ? 'active' : ''}`}
            onClick={() => handleEmergencyMode(!isEmergencyMode)}
            title="Emergency Mode"
          >
            <AlertTriangle />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map((notification, index) => (
            <div key={index} className="notification">
              {notification}
            </div>
          ))}
        </div>
      )}

      {/* Mode selection tabs */}
      <div className={`mode-selector ${isEmergencyMode ? 'emergency-layout' : ''}`}>
        <button
          className={`mode-tab ${activeMode === 'text' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('text')}
          disabled={performanceMetrics.offlineMode}
        >
          <MessageSquare className="mode-icon" />
          <span className={isEmergencyMode ? 'large-text' : ''}>Text</span>
        </button>
        
        <button
          className={`mode-tab ${activeMode === 'speech' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('speech')}
          disabled={performanceMetrics.offlineMode}
        >
          <Mic className="mode-icon" />
          <span className={isEmergencyMode ? 'large-text' : ''}>Speech</span>
          {isListening && <div className="listening-indicator" />}
        </button>
        
        <button
          className={`mode-tab ${activeMode === 'sign' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('sign')}
          disabled={performanceMetrics.offlineMode}
        >
          <Hand className="mode-icon" />
          <span className={isEmergencyMode ? 'large-text' : ''}>Sign</span>
        </button>

        {isEmergencyMode && (
          <button
            className={`mode-tab emergency-tab ${activeMode === 'emergency' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('emergency')}
          >
            <AlertTriangle className="mode-icon" />
            <span className="large-text">EMERGENCY</span>
          </button>
        )}
      </div>

      {/* Visual indicators for active modes */}
      <div className="mode-indicators">
        {activeMode === 'speech' && isListening && (
          <div className="active-indicator speech">
            <Mic className="indicator-icon pulsing" />
            <span>Listening...</span>
          </div>
        )}
        {activeMode === 'sign' && (
          <div className="active-indicator sign">
            <Hand className="indicator-icon" />
            <span>Sign Detection Active</span>
          </div>
        )}
        {isEmergencyMode && (
          <div className="active-indicator emergency">
            <AlertTriangle className="indicator-icon blinking" />
            <span>EMERGENCY MODE</span>
          </div>
        )}
      </div>

      {/* Main interface content */}
      <div className={`interface-content ${isEmergencyMode ? 'emergency-layout' : ''}`}>
        {performanceMetrics.offlineMode ? (
          <OfflineFallback />
        ) : (
          <>
            {activeMode === 'text' && (
              <TranslationInterface
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            )}
            
            {activeMode === 'speech' && (
              <SpeechInterface
                language={sourceLanguage}
                onSpeechToText={(text) => {
                  const startTime = Date.now();
                  // Handle speech to text conversion
                  trackPerformance('speechRecognition', startTime);
                }}
                medicalContext={isEmergencyMode ? 'emergency' : 'general'}
                realTimeMode={true}
                voiceActivityDetection={true}
              />
            )}              {activeMode === 'sign' && (
              <SignLanguageInterface
                onEmergencyDetected={() => handleEmergencyMode(true)}
                onTranslationRequest={(text, context) => {
                  const startTime = Date.now();
                  // Handle sign language translation - simulate API call
                  setTimeout(() => {
                    setTranslatedText(`Translated: ${text}`);
                    trackPerformance('signDetection', startTime);
                  }, 1000);
                }}
                isTranslating={false}
                currentLanguage={targetLanguage}
                translatedText={translatedText}
              />
            )}
              {activeMode === 'emergency' && (
              <EmergencyPhrasesEnhanced
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                largeButtons={true}
                accessibilityMode={true}
              />
            )}
          </>
        )}
      </div>

      {/* Performance panel overlay */}
      <PerformancePanel />      {/* Quick access emergency button (always visible) */}
      <button 
        className={`emergency-quick-access ${isEmergencyMode ? 'active' : ''}`}
        onClick={() => handleEmergencyMode(!isEmergencyMode)}
        title={isEmergencyMode ? "Exit Emergency Mode" : "Emergency Access"}
      >
        {isEmergencyMode ? '✕' : '🚨'}
      </button>
    </div>
  );
};

export default MultiModalInterface;
