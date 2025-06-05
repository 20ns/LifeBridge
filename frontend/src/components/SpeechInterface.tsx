import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Loader } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speakText } from '../services/awsService';

interface SpeechInterfaceProps {
  language: string;
  onSpeechToText: (text: string) => void;
  textToSpeak?: string;
  className?: string;
}

const SpeechInterface: React.FC<SpeechInterfaceProps> = ({
  language,
  onSpeechToText,
  textToSpeak,
  className = ''
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const {
    isRecording,
    isProcessing,
    error: recognitionError,
    startRecording,
    stopRecording,
    isSupported
  } = useSpeechRecognition({
    language,
    onTranscript: onSpeechToText,
    onError: (error) => setSpeechError(`Recognition: ${error}`)
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
      {/* Speech Controls */}
      <div className="flex items-center gap-3">
        {/* Speech-to-Text Button */}
        <button
          onClick={handleSpeechToText}
          disabled={isProcessing}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
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
        </button>

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

      {/* Status Indicators */}
      <div className="space-y-2">
        {isRecording && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-red-700">
              Recording... Speak clearly into your microphone
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">
              Processing speech... This may take a few seconds
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

        {currentError && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-700">
              {currentError}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
        <p className="font-medium mb-1">Instructions:</p>
        <ul className="space-y-1">
          <li>• Click "Start Recording" and speak clearly</li>
          <li>• For medical terms, speak slowly and pronounce clearly</li>
          <li>• Use "Speak Text" to hear translations aloud</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechInterface;
