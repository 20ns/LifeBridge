import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Loader, Activity, Volume1, Languages } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speakText, translateText } from '../services/awsService';
import '../App.css';
import './TranslationInterface.css';

interface SpeechInterfaceProps {
  language: string;
  onSpeechToText: (text: string) => void;
  textToSpeak?: string;
  className?: string;
  medicalContext?: 'emergency' | 'consultation' | 'medication' | 'general';
  realTimeMode?: boolean;
  voiceActivityDetection?: boolean;
  sourceLanguage?: string;
  targetLanguage?: string;
}

const SpeechInterface: React.FC<SpeechInterfaceProps> = ({
  language,
  onSpeechToText,
  textToSpeak,
  className = '',
  medicalContext = 'general',
  realTimeMode = false,
  voiceActivityDetection = true,
  sourceLanguage = 'en',
  targetLanguage = 'es'
}) => {  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [ttsAudioLevel, setTtsAudioLevel] = useState<number>(0);// Handle transcript from speech recognition and auto-translate
  const handleTranscriptReceived = async (transcript: string) => {
    setRecognizedText(transcript);
    onSpeechToText(transcript);

    // Auto-translate the recognized speech
    if (transcript.trim()) {
      try {
        setIsTranslating(true);
        setSpeechError(null);
        
        const translation = await translateText(
          transcript,
          sourceLanguage,
          targetLanguage,
          medicalContext
        );
        
        setTranslatedText(translation.translatedText);
        setIsTranslating(false);
        
        // Optionally speak the translation automatically
        if (medicalContext === 'emergency') {
          handleTextToSpeech(translation.translatedText);
        }
        
      } catch (error) {
        setIsTranslating(false);
        setSpeechError(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
  const {
    isRecording,
    isProcessing,
    error: recognitionError,
    startRecording,
    stopRecording,
    isSupported,
    isSpeechSupported,
    isVoiceDetected,
    audioLevel,
    confidence
  } = useSpeechRecognition({
    language: sourceLanguage,
    onTranscript: handleTranscriptReceived,
    onError: (error) => setSpeechError(`Recognition: ${error}`),
    medicalContext,
    realTimeMode,
    voiceActivityDetection
  });

  const handleSpeechToText = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setSpeechError(null);
      startRecording();
    }
  };  const handleTextToSpeech = async (textToSpeak?: string) => {
    const textForSpeech = textToSpeak || translatedText;
    if (!textForSpeech || isSpeaking) return;

    try {
      setIsSpeaking(true);
      setSpeechError(null);
      setTtsAudioLevel(0);
      
      await speakText(textForSpeech, targetLanguage, (level) => {
        setTtsAudioLevel(level);
      });
    } catch (error) {
      setSpeechError(`Speech: ${error instanceof Error ? error.message : 'Failed to speak text'}`);
    } finally {
      setIsSpeaking(false);
      setTtsAudioLevel(0);
    }
  };

  const currentError = recognitionError || speechError;
  if (!isSupported) {
    return (
      <div className={`interface-container flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <MicOff className="w-5 h-5 text-yellow-600" />
        <span className="text-sm text-yellow-800">
          Speech recognition not supported in this browser
        </span>
      </div>
    );
  }

  if (!isSpeechSupported) {
    return (
      <div className={`interface-container flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <MicOff className="w-5 h-5 text-yellow-600" />
        <span className="text-sm text-yellow-800">
          Browser speech recognition not available. Please use Chrome or Edge.
        </span>
      </div>
    );
  }
  return (
    <div className={`speech-interface ${className}`}>
      {/* Speech Interface Grid - Following Text Mode Design */}
      <div className="translation-grid">
        {/* Input Section - Speech Recognition */}
        <div className="input-section">
          <div className="section-header">
            <h3 className="section-title">Speech Input</h3>
            <div className="language-indicator">{language}</div>
          </div>
          
          <div className="speech-controls">
            <button
              onClick={handleSpeechToText}
              disabled={isProcessing}
              className={`speech-recording-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'disabled' : ''}`}
            >
              {isProcessing ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            {/* Voice Activity & Audio Level Indicators */}
            {isRecording && (
              <div className="recording-feedback">
                {voiceActivityDetection && (
                  <div className="voice-activity-indicator">
                    <Activity className={`w-4 h-4 ${isVoiceDetected ? 'text-green-500' : 'text-yellow-500'}`} />
                    <span className="voice-status">
                      {isVoiceDetected ? 'Voice detected' : 'Waiting for voice...'}
                    </span>
                  </div>
                )}                {((audioLevel !== undefined && audioLevel > 0) || (isSpeaking && ttsAudioLevel > 0)) && (
                  <div className="audio-level-display">
                    <Volume1 className="w-4 h-4 text-blue-600" />
                    <div className="audio-level-bar">
                      <div 
                        className="audio-level-fill" 
                        style={{ 
                          width: `${Math.min(100, (isSpeaking ? ttsAudioLevel : audioLevel || 0) * 100)}%`,
                          backgroundColor: (isSpeaking ? ttsAudioLevel : audioLevel || 0) > 0.5 ? '#10b981' : (isSpeaking ? ttsAudioLevel : audioLevel || 0) > 0.2 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {isSpeaking ? 'Output' : 'Input'}: {Math.round((isSpeaking ? ttsAudioLevel : audioLevel || 0) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>          {/* Medical Context Instructions */}
          <div className="medical-instructions">
            <h4>Medical Speech Tips:</h4>
            <ul>
              <li>Speak medical terms slowly and clearly</li>
              <li>Spell out medication names if not recognized</li>
              <li>Use full phrases: "blood pressure is 120 over 80"</li>
              {realTimeMode && <li>Real-time mode: Natural pauses trigger processing</li>}
              {medicalContext === 'emergency' && (
                <li className="emergency-tip">Emergency mode: Priority processing for urgent terms</li>
              )}
            </ul>
            
            {/* Debug Info removed for production clean UI */}
          </div>
        </div>

        {/* Output Section - Recognition Results */}
        <div className="output-section">          <div className="section-header">
            <h3 className="section-title">Speech Recognition & Translation</h3>
            {translatedText && (<button
              onClick={() => handleTextToSpeech()}
              disabled={isSpeaking || !translatedText}
              className={`text-to-speech-btn ${isSpeaking ? 'speaking' : ''}`}
            >
                {isSpeaking ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                {isSpeaking ? 'Speaking...' : 'Play'}
              </button>
            )}
          </div>
            <div className="speech-output">
            {recognizedText ? (
              <div className="recognition-results">
                <div className="recognized-text">
                  <h5>Recognized ({sourceLanguage}):</h5>
                  <p>{recognizedText}</p>
                </div>
                
                {isTranslating && (
                  <div className="translation-loading">
                    <Languages className="w-4 h-4 animate-spin" />
                    <span>Translating...</span>
                  </div>
                )}
                
                {translatedText && (
                  <div className="translated-text">
                    <h5>Translation ({targetLanguage}):</h5>
                    <p>{translatedText}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="output-placeholder">
                {isRecording ? 'Listening for speech...' : 'Click "Start Recording" to begin'}
              </div>
            )}
          </div>

          {/* Status Messages */}
          <div className="status-messages">
            {isProcessing && (
              <div className="status-message processing">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing with medical terminology optimization...</span>
              </div>
            )}

            {isSpeaking && (
              <div className="status-message speaking">
                <Volume2 className="w-4 h-4" />
                <span>Speaking translation...</span>
              </div>
            )}

            {confidence && (
              <div className="status-message confidence">
                <span>Confidence: {Math.round(confidence * 100)}%</span>
              </div>
            )}            {currentError && (
              <div className="status-message error">
                <div className="error-dot"></div>
                <span>{currentError}</span>
                
                {/* Enhanced error guidance */}
                {currentError.includes('multiple attempts') && (
                  <div className="error-guidance">
                    <strong>💡 Suggestion:</strong> Speech recognition failed after multiple attempts. 
                    Please try using the <strong>Text</strong> mode instead for reliable translation.
                  </div>
                )}
                {currentError.includes('network') && (
                  <div className="error-guidance">
                    <strong>💡 Try:</strong> Check your internet connection or use <strong>Text</strong> mode.
                  </div>
                )}
                {currentError.includes('permission') && (
                  <div className="error-guidance">
                    <strong>💡 Fix:</strong> Click the microphone icon in your browser's address bar to allow access.
                  </div>
                )}
                {currentError.includes('not supported') && (
                  <div className="error-guidance">
                    <strong>💡 Alternative:</strong> Your browser doesn't support speech recognition. 
                    Please use the <strong>Text</strong> mode instead.
                  </div>
                )}
              </div>
            )}</div>
        </div>
      </div>
    </div>
  );
};

export default SpeechInterface;
