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
import SignLanguageInterface, { SignLanguageInterfaceHandle } from './SignLanguageInterface';
import EmergencyPhrasesEnhanced from './EmergencyPhrasesEnhanced';
import MedicalContextIndicator from './MedicalContextIndicator';
import { translateText } from '../services/awsService';
import './MultiModalInterface.css';

type CommunicationMode = 'text' | 'speech' | 'sign' | 'emergency';
type MedicalContextType = 'emergency' | 'consultation' | 'medication' | 'general';

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
  performanceMode: 'standard' | 'optimized';
}

const MultiModalInterface: React.FC<MultiModalInterfaceProps> = ({
  sourceLanguage,
  targetLanguage,
  onLanguageSwitch,
  performanceMode
}) => {  // State management
  const [activeMode, setActiveMode] = useState<CommunicationMode>('text');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<{
    id: number;
    message: string;
    isVisible: boolean;
    isLeaving: boolean;
  } | null>(null);
  const [translatedText, setTranslatedText] = useState('');

  // Caching mechanism
  const translationCache = useRef<Map<string, any>>(new Map());
  const performanceTimers = useRef<Map<string, number>>(new Map());
  const signLanguageInterfaceRef = useRef<SignLanguageInterfaceHandle>(null); // Ref for SignLanguageInterface

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
    });  }, []);  // Enhanced emergency mode handler
  const handleEmergencyMode = useCallback((enabled: boolean) => {
    if (isTransitioning) return; // Prevent multiple rapid clicks
    
    setIsTransitioning(true);
    
    // Small delay for smooth visual transition
    setTimeout(() => {
      setIsEmergencyMode(enabled);
      if (enabled) {
        setActiveMode('emergency');
      } else {
        // When exiting emergency mode, smoothly transition back to text mode (home page)
        setActiveMode('text');
      }
        // Add emergency notification
      if (enabled) {
        addNotification('🚨 Emergency mode activated - Priority processing enabled');
      } else {
        addNotification('✅ Emergency mode deactivated - Returned to normal interface');
      }
      
      // Reset transition state
      setTimeout(() => setIsTransitioning(false), 300);
    }, 100);
  }, [isTransitioning]);

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
  // Notification system with seamless transitions
  const addNotification = useCallback((message: string) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      message,
      isVisible: false,
      isLeaving: false
    };

    // If there's a current notification, start its fade-out transition
    if (currentNotification) {
      setCurrentNotification(prev => prev ? { ...prev, isLeaving: true } : null);
      
      // After fade-out completes, show the new notification
      setTimeout(() => {
        setCurrentNotification({ ...newNotification, isVisible: true });
      }, 300); // Wait for fade-out animation
    } else {
      // No current notification, show new one immediately
      setCurrentNotification(newNotification);
      
      // Trigger fade-in after a brief delay
      setTimeout(() => {
        setCurrentNotification(prev => prev ? { ...prev, isVisible: true } : null);
      }, 50);
    }

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setCurrentNotification(prev => {
        if (prev && prev.id === newNotification.id) {
          return { ...prev, isLeaving: true };
        }
        return prev;
      });
      
      // Completely remove after fade-out
      setTimeout(() => {
        setCurrentNotification(prev => {
          if (prev && prev.id === newNotification.id) {
            return null;
          }
          return prev;
        });
      }, 300);
    }, 5000);
  }, [currentNotification]);

  // Enhanced mode switching with visual feedback
  const handleModeSwitch = useCallback((mode: CommunicationMode) => {
    const startTime = Date.now();
    
    // Add visual feedback class temporarily
    const modeSelector = document.querySelector('.mode-selector');
    if (modeSelector) {
      modeSelector.classList.add('switching');
      setTimeout(() => {
        modeSelector.classList.remove('switching');
      }, 300);
    }
    
    setActiveMode(mode);
    
    // Stop any active listening when switching modes
    if (mode !== 'speech') {
      setIsListening(false);
    }

    trackPerformance('modeSwitch', startTime);
    addNotification(`Switched to ${mode} mode`);
  }, [trackPerformance, addNotification]);

  // Effect to manage sign language detection based on activeMode
  useEffect(() => {
    if (activeMode === 'sign') {
      console.log('[MultiModalInterface] Mode switched to sign. Attempting to triggerStartDetection.');
      signLanguageInterfaceRef.current?.triggerStartDetection();
    } else {
      // If mode is not 'sign', ensure detection is stopped if it was active
      if (signLanguageInterfaceRef.current?.isDetectionActive()) {
        console.log('[MultiModalInterface] Mode switched away from sign. Attempting to triggerStopDetection.');
        signLanguageInterfaceRef.current?.triggerStopDetection();
      }
    }
  }, [activeMode]);


  // Memoized callbacks for SignLanguageInterface
  const handleSignEmergencyDetected = useCallback(() => {
    handleEmergencyMode(true);
  }, [handleEmergencyMode]);  const handleSignTranslationRequest = useCallback(async (text: string, context: string) => {
    const startTime = Date.now();
    console.log(`[MultiModalInterface] Sign translation requested. Text: "${text}", Context: "${context}"`);
    
    try {
      // Determine the context based on sign language detection
      const translationContext: 'emergency' | 'consultation' | 'medication' | 'general' = 
        context.includes('emergency') ? 'emergency' : 
        context.includes('medication') ? 'medication' : 
        context.includes('medical') ? 'consultation' : 'general';
      
      // Use the translation service with performance mode
      const result = await translateText(text, sourceLanguage, targetLanguage, translationContext, performanceMode);
      setTranslatedText(result.translatedText);
      trackPerformance('signDetection', startTime);
      addNotification(`Sign language translated: "${result.translatedText}"`);
    } catch (error) {
      console.error('Sign language translation failed:', error);
      setTranslatedText(`Translation failed: ${text}`);
      addNotification('Sign language translation failed');
    }
  }, [sourceLanguage, targetLanguage, performanceMode, trackPerformance, addNotification]);

  // Enhanced connection quality indicator with better visual states
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
      <div className={`connection-strength-bar ${connectionQuality.status}`}>
        <div 
          className="strength-fill" 
          style={{ width: `${connectionQuality.strength}%` }}
        />
      </div>
    </div>
  );

  // Performance panel
  const PerformancePanel = () => (
    <div className={`performance-panel ${showPerformancePanel ? 'visible' : 'hidden'}`}>        <div className="performance-header">
          <Monitor className="performance-icon" />
          <span>Performance Metrics</span>
          <button 
            className="close-button"
            onClick={() => setShowPerformancePanel(false)}
          >
            ×
          </button>
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
      <div className="offline-content">        <h3>Connection Lost</h3>
        <p>Using cached translations and offline features</p>
        <button 
          className="retry-connection-button"
          onClick={() => window.location.reload()}
        >
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
          <div className={`performance-mode-indicator ${performanceMode}`}>
            <Zap size={14} />
            <span>{performanceMode === 'optimized' ? 'OPTIMIZED' : 'STANDARD'}</span>
          </div>
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
      </div>      {/* Seamless Single Notification */}
      {currentNotification && (
        <div 
          className={`single-notification ${currentNotification.isVisible ? 'visible' : ''} ${currentNotification.isLeaving ? 'leaving' : ''}`}
        >
          {currentNotification.message}
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
          <>            {activeMode === 'text' && (              <TranslationInterface
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isListening={isListening}
                setIsListening={setIsListening}
                performanceMode={performanceMode}
                medicalContext={isEmergencyMode ? 'emergency' : 'general'}
              />
            )}
              {activeMode === 'speech' && (              <SpeechInterface
                language={sourceLanguage}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                onSpeechToText={(text) => {
                  const startTime = Date.now();
                  // Handle speech to text conversion
                  trackPerformance('speechRecognition', startTime);
                }}
                medicalContext={isEmergencyMode ? 'emergency' : 'general'}
                realTimeMode={true}
                voiceActivityDetection={true}
              />
            )}
            {/* Always render SignLanguageInterface but control visibility */}
            <div className="translation-card" style={{ display: activeMode === 'sign' ? 'block' : 'none' }}>
              <SignLanguageInterface
                ref={signLanguageInterfaceRef} // Assign ref
                onEmergencyDetected={handleSignEmergencyDetected}
                onTranslationRequest={handleSignTranslationRequest}
                isTranslating={false} // Consider if this should be dynamic
                currentLanguage={targetLanguage}
                translatedText={translatedText} // This is passed down
              />
            </div>
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
        className={`emergency-quick-access ${isEmergencyMode ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
        onClick={() => handleEmergencyMode(!isEmergencyMode)}
        title={isEmergencyMode ? "Exit Emergency Mode & Return to Home" : "Emergency Access"}
        disabled={isTransitioning}
      >
        {isTransitioning ? '⟳' : (isEmergencyMode ? '✕' : '🚨')}
      </button>
    </div>
  );
};

export default MultiModalInterface;
