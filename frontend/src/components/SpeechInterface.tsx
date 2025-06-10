import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Loader, Activity, Volume1 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speakText } from '../services/awsService';

interface SpeechInterfaceProps {
  language: string;
  onSpeechToText: (text: string) => void;
  textToSpeak?: string;
  className?: string;
  medicalContext?: 'emergency' | 'consultation' | 'medication' | 'general';
  realTimeMode?: boolean;
  voiceActivityDetection?: boolean;
}

const SpeechInterface: React.FC<SpeechInterfaceProps> = ({
  language,
  onSpeechToText,
  textToSpeak,
  className = '',
  medicalContext = 'general',
  realTimeMode = false,
  voiceActivityDetection = true
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const {
    isRecording,
    isProcessing,
    error: recognitionError,
    startRecording,
    stopRecording,
    isSupported,
    isVoiceDetected,
    audioLevel,
    confidence
  } = useSpeechRecognition({
    language,
    onTranscript: onSpeechToText,
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
  };

  const handleTextToSpeech = async () => {
    if (!textToSpeak || isSpeaking) return;

    try {
      setIsSpeaking(true);
      setSpeechError(null);
      await speakText(textToSpeak, language);
    } catch (error) {
      setSpeechError(`Speech: ${error instanceof Error ? error.message : 'Failed to speak text'}`);
    } finally {
      setIsSpeaking(false);
    }
  };

  const currentError = recognitionError || speechError;

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <MicOff className="w-5 h-5 text-yellow-600" />
        <span className="text-sm text-yellow-800">
          Speech recognition not supported in this browser
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Enhanced Speech Controls with Medical Context */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Speech-to-Text Button with enhanced indicators */}
        <button
          onClick={handleSpeechToText}
          disabled={isProcessing}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all relative
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isProcessing ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          
          {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
          
          {/* Voice Activity Indicator */}
          {voiceActivityDetection && isRecording && (
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              isVoiceDetected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`} />
          )}
        </button>

        {/* Audio Level Indicator */}
        {voiceActivityDetection && isRecording && (
          <div className="flex items-center gap-2">
            <Volume1 className="w-4 h-4 text-gray-600" />
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Medical Context Indicator */}
        {medicalContext !== 'general' && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
            <Activity className="w-3 h-3 text-blue-600" />
            <span className="text-blue-700 capitalize">{medicalContext}</span>
          </div>
        )}

        {/* Text-to-Speech Button */}
        {textToSpeak && (
          <button
            onClick={handleTextToSpeech}
            disabled={isSpeaking || !textToSpeak.trim()}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              bg-green-500 hover:bg-green-600 text-white
              ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isSpeaking ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
            
            {isSpeaking ? 'Speaking...' : 'Speak Text'}
          </button>
        )}
      </div>

      {/* Enhanced Status Indicators */}
      <div className="space-y-2">
        {realTimeMode && voiceActivityDetection && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">
              Real-time mode active - Speak naturally, pauses will trigger processing
            </span>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-red-700">
              Recording... Speak clearly into your microphone
              {voiceActivityDetection && (
                <span className="ml-2">
                  {isVoiceDetected ? '🗣️ Voice detected' : '⏸️ Waiting for voice...'}
                </span>
              )}
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">
              Processing speech with medical terminology optimization...
            </span>
          </div>
        )}

        {isSpeaking && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <Volume2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Speaking translation...
            </span>
          </div>
        )}

        {confidence && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700">
              Transcription confidence: {Math.round(confidence * 100)}%
            </span>
          </div>
        )}

        {currentError && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-700">
              {currentError}
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Instructions for Medical Context */}
      <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
        <p className="font-medium mb-2">Medical Speech Recognition Instructions:</p>
        <ul className="space-y-1">
          <li>• Speak medical terms slowly and clearly</li>
          <li>• Spell out medication names if not recognized</li>
          <li>• Use full phrases: "blood pressure is 120 over 80"</li>
          {realTimeMode && <li>• Real-time mode: Natural pauses trigger processing</li>}
          {medicalContext === 'emergency' && (
            <li className="text-red-600">• Emergency mode: Priority processing for urgent terms</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SpeechInterface;
