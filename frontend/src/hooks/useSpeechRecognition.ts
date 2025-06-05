import { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/awsService';
import { useVoiceActivityDetection } from './useVoiceActivityDetection';

interface UseSpeechRecognitionProps {
  language: string;
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  medicalContext?: 'emergency' | 'consultation' | 'medication' | 'general';
  realTimeMode?: boolean;
  voiceActivityDetection?: boolean;
}

interface SpeechRecognitionState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  transcript: string | null;
  isVoiceDetected: boolean;
  audioLevel: number;
  confidence: number | null;
}

export const useSpeechRecognition = ({
  language,
  onTranscript,
  onError,
  medicalContext = 'general',
  realTimeMode = false,
  voiceActivityDetection = true
}: UseSpeechRecognitionProps) => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: null,
    isVoiceDetected: false,
    audioLevel: 0,
    confidence: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const realTimeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice activity detection for automatic recording control
  const vadHook = useVoiceActivityDetection({
    onVoiceStart: () => {
      setState(prev => ({ ...prev, isVoiceDetected: true }));
      if (voiceActivityDetection && realTimeMode && !state.isRecording) {
        startRecording();
      }
    },
    onVoiceEnd: () => {
      setState(prev => ({ ...prev, isVoiceDetected: false }));
      if (voiceActivityDetection && realTimeMode && state.isRecording) {
        // Add a small delay to avoid cutting off speech
        realTimeTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, 500);
      }
    },
    onVolumeChange: (volume) => {
      setState(prev => ({ ...prev, audioLevel: volume }));
    },
    sensitivity: 0.2, // Lower sensitivity for medical environments
    enabled: voiceActivityDetection && realTimeMode
  });
  const startRecording = useCallback(async () => {
    try {
      // Clear any pending timeouts
      if (realTimeTimeoutRef.current) {
        clearTimeout(realTimeTimeoutRef.current);
        realTimeTimeoutRef.current = null;
      }

      // Reset state
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: null
      }));

      // Start voice activity detection if enabled
      if (voiceActivityDetection && !vadHook.isListening) {
        await vadHook.startListening();
      }

      // Request microphone access with medical-optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Optimal for speech recognition
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Initialize MediaRecorder with medical-optimized format
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Better compression for medical speech
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

          // Combine audio chunks into a single blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to WAV for better AWS Transcribe compatibility
          const wavBlob = await convertToWav(audioBlob);
            // Send to AWS Transcribe with medical context
          const result = await transcribeAudio(wavBlob, language, medicalContext);
          
          setState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            transcript: result.transcript,
            confidence: result.confidence,
            error: null 
          }));

          onTranscript(result.transcript);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Speech recognition failed';
          setState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            error: errorMessage 
          }));
          
          if (onError) {
            onError(errorMessage);
          }
        }

        // Clean up media stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: errorMessage 
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }  }, [language, onTranscript, onError, medicalContext, voiceActivityDetection, vadHook]);

  const stopRecording = useCallback(() => {
    // Clear any pending timeouts
    if (realTimeTimeoutRef.current) {
      clearTimeout(realTimeTimeoutRef.current);
      realTimeTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop voice activity detection
    if (voiceActivityDetection && vadHook.isListening) {
      vadHook.stopListening();
    }
    
    setState(prev => ({ ...prev, isRecording: false }));
  }, [state.isRecording, voiceActivityDetection, vadHook]);

  // Enhanced WAV conversion for medical audio processing
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    // For production, implement proper audio conversion
    // For now, return the original blob as AWS Transcribe handles webm
    return blob;
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    isSupported: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    // Expose voice activity detection state
    isVoiceDetected: vadHook.isVoiceDetected || state.isVoiceDetected,
    audioLevel: vadHook.volume || state.audioLevel
  };
};
