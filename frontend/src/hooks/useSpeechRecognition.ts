import { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/awsService';

interface UseSpeechRecognitionProps {
  language: string;
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface SpeechRecognitionState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  transcript: string | null;
}

export const useSpeechRecognition = ({
  language,
  onTranscript,
  onError
}: UseSpeechRecognitionProps) => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: null
      }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Optimal for speech recognition
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Most browsers support this
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
          
          // Send to AWS Transcribe
          const transcript = await transcribeAudio(wavBlob, language);
          
          setState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            transcript,
            error: null 
          }));

          onTranscript(transcript);

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
    }
  }, [language, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [state.isRecording]);

  // Simple WAV conversion for better compatibility
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    // For now, return the original blob
    // In production, you might want to use a library like RecorderJS
    // to properly convert to WAV format
    return blob;
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    isSupported: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  };
};
