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
import { audioManager } from '../utils/audioManager';
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
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);  const [isTransitioning, setIsTransitioning] = useState(false);
  const [manualEmergencyOverride, setManualEmergencyOverride] = useState(false);
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
  // Keep a ref in sync with currentNotification to avoid extra re-renders in callbacks
  const currentNotificationRef = useRef<typeof currentNotification>(null);
  useEffect(() => {
    currentNotificationRef.current = currentNotification;
  }, [currentNotification]);
  const [translatedText, setTranslatedText] = useState('');

  // Caching mechanism
  const translationCache = useRef<Map<string, any>>(new Map());
  const performanceTimers = useRef<Map<string, number>>(new Map());
  const signLanguageInterfaceRef = useRef<SignLanguageInterfaceHandle>(null); // Ref for SignLanguageInterface

  // Temporary debug flag: set to true if you need detailed console output during development
  const DEBUG = false;

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
    if (DEBUG) console.log(`${operation} completed in ${latency}ms`);
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
  }, []);  // Notification system with seamless transitions - moved early to avoid dependency issues
  const addNotification = useCallback((message: string) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      message,
      isVisible: false,
      isLeaving: false
    };

    // If there's a current notification, start its fade-out transition
    if (currentNotificationRef.current) {
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
  }, []);
  // Refs for managing transition state and timeouts
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overrideCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const isTransitioningRef = useRef(false);
  // Cleanup function for transition timeouts
  const cleanupTransition = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (overrideCooldownRef.current) {
      clearTimeout(overrideCooldownRef.current);
      overrideCooldownRef.current = null;
    }
    isTransitioningRef.current = false;
    setIsTransitioning(false);
  }, []);  // Enhanced emergency mode handler with robust transition management
  const handleEmergencyMode = useCallback((enabled: boolean, isManualTrigger = false) => {
    // Prevent multiple rapid clicks using ref instead of state
    if (isTransitioningRef.current) {
      if (DEBUG) console.log('[Emergency Button] Already transitioning, ignoring click');
      return;
    }
    
    // Prevent redundant state changes - if already in the target state, do nothing
    if (enabled === isEmergencyMode) {
      if (DEBUG) console.log(`[Emergency Button] Already in ${enabled ? 'emergency' : 'normal'} mode, no action needed`);
      return;
    }
    
    if (DEBUG) {
      console.log(`[Emergency Button] Starting transition to ${enabled ? 'emergency' : 'normal'} mode`);
    }
    
    // Clean up any existing transition
    cleanupTransition();
    
    // Set transition state
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    
    // Use a small delay to ensure smooth visual transition
    setTimeout(() => {
      // Update the emergency mode and active mode
      if (DEBUG) console.log(`[Emergency Button] Setting emergency mode to: ${enabled}`);
      setIsEmergencyMode(enabled);
        if (enabled) {
        if (DEBUG) console.log('[Emergency Button] Switching to emergency mode');
        setActiveMode('emergency');
        addNotification('🚨 Emergency mode activated - Priority processing enabled');
      } else {
        if (DEBUG) console.log('[Emergency Button] Switching to text mode (home page)');
        setActiveMode('text'); // Return to text mode when exiting emergency
        addNotification('✅ Emergency mode deactivated - Returned to normal interface');
        
        // Ensure sign-language detection is fully stopped to prevent
        // background gestures (e.g., a lingering fist) from re-triggering
        if (signLanguageInterfaceRef.current?.isDetectionActive()) {
          signLanguageInterfaceRef.current.triggerStopDetection();
        }
        
        // If manually exiting emergency mode, set override to prevent gesture auto-trigger
        if (isManualTrigger) {
          if (DEBUG) console.log('[Emergency Button] Setting manual override to prevent gesture re-triggering');
          setManualEmergencyOverride(true);
          
          // Clear the override after a cooldown period
          if (overrideCooldownRef.current) {
            clearTimeout(overrideCooldownRef.current);
          }
          overrideCooldownRef.current = setTimeout(() => {
            if (DEBUG) console.log('[Emergency Button] Clearing manual override after cooldown');
            setManualEmergencyOverride(false);
            overrideCooldownRef.current = null;
          }, 10000); // 10 second cooldown to prevent immediate re-triggering
        }
      }
      
      // Set a timeout to reset the transition state after CSS animation completes
      transitionTimeoutRef.current = setTimeout(() => {
        if (DEBUG) console.log('[Emergency Button] Transition complete, resetting state');
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        transitionTimeoutRef.current = null;
      }, 500); // Give extra time to ensure CSS animation completes
    }, 50); // Small delay for smooth visual feedback
    
  }, [addNotification, cleanupTransition, isEmergencyMode, activeMode]);// Include current states for debugging

  // Handle clicking on LifeBridge AI text when in emergency mode
  const handleHeaderClick = useCallback(() => {
    if (isEmergencyMode) {
      const confirmed = window.confirm(
        'Are you sure you want to exit emergency mode?\n\nThis will return you to the normal interface.'
      );
      if (confirmed) {
        handleEmergencyMode(false);
      }
    }  }, [isEmergencyMode, handleEmergencyMode]);

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
      if (DEBUG) console.log('[MultiModalInterface] Mode switched to sign. Attempting to triggerStartDetection.');
      signLanguageInterfaceRef.current?.triggerStartDetection();
      // Reset audio throttling when entering sign mode for fresh start
      audioManager.resetThrottling();
    } else {
      // If mode is not 'sign', ensure detection is stopped if it was active
      if (signLanguageInterfaceRef.current?.isDetectionActive()) {
        if (DEBUG) console.log('[MultiModalInterface] Mode switched away from sign. Attempting to triggerStopDetection.');
        signLanguageInterfaceRef.current?.triggerStopDetection();
      }
      // Stop any ongoing audio when leaving sign mode
      audioManager.stopAllAudio();
    }
  }, [activeMode]);

  // Memoized callback for SignLanguageInterface
  const handleSignEmergencyDetected = useCallback(() => {
    // Only trigger emergency mode if we're not already in emergency mode
    // AND not under manual override AND not transitioning
    if (!isEmergencyMode && !isTransitioningRef.current && !manualEmergencyOverride) {
      if (DEBUG) console.log('[Gesture Detection] Emergency gesture detected, activating emergency mode');
      handleEmergencyMode(true);
    } else {
      if (DEBUG) console.log('[Gesture Detection] Emergency gesture detected but ignoring due to:', {
        isEmergencyMode,
        isTransitioning: isTransitioningRef.current,
        manualOverride: manualEmergencyOverride      });
    }
  }, [handleEmergencyMode, isEmergencyMode, manualEmergencyOverride]);

  const handleSignTranslationRequest = useCallback(async (text: string, context: string) => {
    const startTime = Date.now();
    if (DEBUG) console.log(`[MultiModalInterface] Sign translation requested. Text: "${text}", Context: "${context}"`);
    
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
  // Cleanup timeouts on unmount to prevent memory leaks and stuck states
  useEffect(() => {
    return () => {
      cleanupTransition();
    };
  }, [cleanupTransition]);
  // Ensure transition state resets if emergency mode changes externally
  useEffect(() => {
    // If we're not in a transition but somehow the state got stuck, reset it
    if (!isTransitioning) return;
    
    // Failsafe: reset transition state after maximum expected time
    const failsafeTimeout = setTimeout(() => {
      if (DEBUG) console.log('[Emergency Button] Failsafe timeout triggered, resetting transition state');
      cleanupTransition();
    }, 800); // Longer than the normal timeout
    
    return () => clearTimeout(failsafeTimeout);
  }, [isTransitioning, cleanupTransition]);

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
      </div>      {/* Visual indicators for active modes */}
      <div className="mode-indicators">
        {activeMode === 'speech' && isListening && (
          <div className="active-indicator speech">
            <Mic className="indicator-icon pulsing" />
            <span>Listening...</span>
          </div>
        )}        {activeMode === 'sign' && (
          <button 
            className={`active-indicator sign detection-toggle ${signLanguageInterfaceRef.current?.isDetectionActive() ? 'active' : ''}`}
            onClick={() => {
              const isCurrentlyActive = signLanguageInterfaceRef.current?.isDetectionActive();
              if (isCurrentlyActive) {
                signLanguageInterfaceRef.current?.triggerStopDetection();
              } else {
                signLanguageInterfaceRef.current?.triggerStartDetection();
              }
            }}
            title={signLanguageInterfaceRef.current?.isDetectionActive() ? 'Click to stop sign detection' : 'Click to start sign detection'}
            aria-label={signLanguageInterfaceRef.current?.isDetectionActive() ? 'Stop sign language detection' : 'Start sign language detection'}
          >
            <Hand className={`indicator-icon ${signLanguageInterfaceRef.current?.isDetectionActive() ? 'pulsing' : ''}`} />
            <span>{signLanguageInterfaceRef.current?.isDetectionActive() ? 'Stop Detection' : 'Start Detection'}</span>
          </button>
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
            <div className="translation-card" style={{ display: activeMode === 'sign' ? 'block' : 'none' }}>              <SignLanguageInterface
                ref={signLanguageInterfaceRef} // Assign ref
                onEmergencyDetected={handleSignEmergencyDetected}
                onTranslationRequest={handleSignTranslationRequest}
                addNotification={addNotification}
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
        className={`emergency-quick-access ${isEmergencyMode ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          // If the button somehow becomes unresponsive due to a lingering transition
          // state, force-reset the transition so that the click can take effect.
          if (isTransitioningRef.current) {
            if (DEBUG) console.log('[Emergency Button] Transition appeared stuck - performing manual cleanup before toggling mode');
            cleanupTransition();
          }

          if (DEBUG) console.log(`[Emergency Button] Manual click detected. Current state: emergency=${isEmergencyMode}, transitioning=${isTransitioning}`);
          handleEmergencyMode(!isEmergencyMode, true); // Pass true for manual trigger
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Double-click as emergency reset if button gets stuck
          if (DEBUG) console.log('[Emergency Button] Double-click detected, forcing reset');
          cleanupTransition();
        }}
        title={isEmergencyMode ? "Exit Emergency Mode & Return to Home" : "Emergency Access"}
        disabled={false} // Never disable the button - handle in onClick instead
      >
        {isTransitioning ? '⟳' : (isEmergencyMode ? '✕' : '🚨')}
      </button>
    </div>
  );
};

export default MultiModalInterface;
