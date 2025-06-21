import React, { useState, useCallback, useRef, useEffect } from 'react';
import TranslationInterface from './TranslationInterface';
import SpeechInterface from './SpeechInterface';
import SignLanguageInterface, { SignLanguageInterfaceHandle } from './SignLanguageInterface';
import EmergencyPhrasesEnhanced from './EmergencyPhrasesEnhanced';
import PerformancePanel from './PerformancePanel';
import OfflineFallback from './OfflineFallback';
import { useConnectionQuality } from '../hooks/useConnectionQuality';
import { usePerformanceMetrics } from '../hooks/usePerformanceMetrics';
import { useNotifications } from '../hooks/useNotifications';
import { translateText } from '../services/awsService';
import { audioManager } from '../utils/audioManager';
import InterfaceHeader from './InterfaceHeader';
import ModeSelector from './ModeSelector';
import './MultiModalInterface.css';

type CommunicationMode = 'text' | 'speech' | 'sign' | 'emergency';

type MultiModalInterfaceProps = {
  sourceLanguage: string;
  targetLanguage: string;
  onLanguageSwitch: () => void;
  performanceMode: 'standard' | 'optimized';
};

const MultiModalInterface: React.FC<MultiModalInterfaceProps> = ({
  sourceLanguage,
  targetLanguage,
  onLanguageSwitch: _onLanguageSwitch,
  performanceMode,
}) => {
  /* ------------------------------------------------------------------ */
  /* state & refs                                                       */
  /* ------------------------------------------------------------------ */
  const [activeMode, setActiveMode] = useState<CommunicationMode>('text');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const signLanguageInterfaceRef = useRef<SignLanguageInterfaceHandle>(null);

  /* ------------------------------------------------------------------ */
  /* hooks                                                              */
  /* ------------------------------------------------------------------ */
  const { connectionQuality, offlineMode } = useConnectionQuality();
  const { performanceMetrics, trackPerformance, incrementCacheHit } = usePerformanceMetrics();
  const { currentNotification, addNotification } = useNotifications();

  /* ------------------------------------------------------------------ */
  /* emergency mode handler                                             */
  /* ------------------------------------------------------------------ */
  const handleEmergencyToggle = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsEmergencyMode(prev => !prev);
      setActiveMode(prev => (prev === 'emergency' ? 'text' : 'emergency'));
      setIsTransitioning(false);
    }, 300);
  }, []);

  /* ------------------------------------------------------------------ */
  /* mode switching                                                     */
  /* ------------------------------------------------------------------ */
  const handleModeSwitch = useCallback(
    (mode: CommunicationMode) => {
      const start = Date.now();
      setActiveMode(mode);
      if (mode !== 'speech') setIsListening(false);
      trackPerformance('modeSwitch', start);
      addNotification(`Switched to ${mode} mode`);
    },
    [trackPerformance, addNotification]
  );

  /* ------------------------------------------------------------------ */
  /* sign callbacks                                                     */
  /* ------------------------------------------------------------------ */
  const handleSignEmergencyDetected = useCallback(() => {
    if (!isEmergencyMode) handleEmergencyToggle();
  }, [isEmergencyMode, handleEmergencyToggle]);

  const handleSignTranslationRequest = useCallback(
    async (text: string, context: string) => {
      const start = Date.now();
      try {
        const result = await translateText(text, sourceLanguage, targetLanguage, context as any, performanceMode);
        setTranslatedText(result.translatedText);
        trackPerformance('signDetection', start);
        addNotification(`Sign translated: "${result.translatedText}"`);
        incrementCacheHit();
      } catch (err) {
        console.error(err);
        setTranslatedText(`Translation failed: ${text}`);
        addNotification('Sign language translation failed');
      }
    },
    [sourceLanguage, targetLanguage, performanceMode, trackPerformance, addNotification, incrementCacheHit]
  );

  /* ------------------------------------------------------------------ */
  /* sign detection auto start / stop                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (activeMode === 'sign') {
      signLanguageInterfaceRef.current?.triggerStartDetection();
      audioManager.resetThrottling();
    } else {
      signLanguageInterfaceRef.current?.triggerStopDetection();
      audioManager.stopAllAudio();
    }
  }, [activeMode]);

  /* ------------------------------------------------------------------ */
  return (
    <div className={`multi-modal-interface ${isEmergencyMode ? 'emergency-mode' : ''}`}>
      <InterfaceHeader
        connectionQuality={connectionQuality}
        isEmergencyMode={isEmergencyMode}
        onTogglePerformance={() => setShowPerformancePanel(p => !p)}
        onToggleEmergency={handleEmergencyToggle}
      />

      {/* Notifications */}
      {currentNotification && (
        <div className={`single-notification ${currentNotification.isVisible ? 'visible' : ''} ${currentNotification.isLeaving ? 'leaving' : ''}`}>
          {currentNotification.message}
        </div>
      )}

      <ModeSelector
        activeMode={activeMode}
        isEmergencyMode={isEmergencyMode}
        onSelectMode={handleModeSwitch}
      />

      {/* Main content */}
      <div className="interface-content">
        {offlineMode ? (
          <OfflineFallback />
        ) : (
          <>
            {activeMode === 'text' && (
              <TranslationInterface
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                isListening={isListening}
                setIsListening={setIsListening}
                performanceMode={performanceMode}
                medicalContext={isEmergencyMode ? 'emergency' : 'general'}
              />
            )}
            {activeMode === 'speech' && (
              <SpeechInterface
                language={sourceLanguage}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                onSpeechToText={() => trackPerformance('speechRecognition', Date.now())}
                medicalContext={isEmergencyMode ? 'emergency' : 'general'}
                realTimeMode
                voiceActivityDetection
              />
            )}
            <div style={{ display: activeMode === 'sign' ? 'block' : 'none' }}>
              <SignLanguageInterface
                ref={signLanguageInterfaceRef}
                onEmergencyDetected={handleSignEmergencyDetected}
                onTranslationRequest={handleSignTranslationRequest}
                addNotification={addNotification}
                isTranslating={false}
                currentLanguage={targetLanguage}
                translatedText={translatedText}
              />
            </div>
            {activeMode === 'emergency' && (
              <EmergencyPhrasesEnhanced
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                largeButtons
                accessibilityMode
              />
            )}
          </>
        )}
      </div>

      {/* Performance panel */}
      <PerformancePanel metrics={performanceMetrics} visible={showPerformancePanel} offlineMode={offlineMode} onClose={() => setShowPerformancePanel(false)} />

      {/* Quick emergency button */}
      <button className={`emergency-quick-access ${isEmergencyMode ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`} onClick={handleEmergencyToggle}>
        {isTransitioning ? '⟳' : isEmergencyMode ? '✕' : '🚨'}
      </button>
    </div>
  );
};

export default MultiModalInterface;
