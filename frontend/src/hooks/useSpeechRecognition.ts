import { useState, useRef, useCallback, useEffect } from 'react';
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
  retryCount: number;
}

export const useSpeechRecognition = ({
  language,
  onTranscript,
  onError,
  medicalContext = 'general',
  realTimeMode = false,
  voiceActivityDetection = true
}: UseSpeechRecognitionProps) => {  const [state, setState] = useState<SpeechRecognitionState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: null,
    isVoiceDetected: false,
    audioLevel: 0,
    confidence: null,
    retryCount: 0
  });

  const [shouldTryAWSFallback, setShouldTryAWSFallback] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const realTimeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);

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
        }, 500);      }
    },
    onVolumeChange: (volume) => {
      setState(prev => ({ ...prev, audioLevel: volume }));
    },
    sensitivity: 0.2, // Lower sensitivity for medical environments
    enabled: voiceActivityDetection && realTimeMode
  });

  // Browser-based speech recognition (more reliable for basic use cases)
  const startBrowserSpeechRecognition = useCallback(async (SpeechRecognition: any) => {
    try {
      console.log('Starting browser speech recognition...');
      
      // Check microphone permission first
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permission.state === 'denied') {
            const errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
            setState(prev => ({ ...prev, error: errorMessage }));
            if (onError) onError(errorMessage);
            return;
          }
        } catch (permError) {
          console.log('Permission check not available, proceeding...');
        }
      }      const recognition = new SpeechRecognition();
      
      // Configure recognition settings
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      // Set up audio level monitoring for the speech recognition session
      let audioContext: AudioContext | null = null;
      let analyser: AnalyserNode | null = null;
      let microphone: MediaStreamAudioSourceNode | null = null;
      let audioLevelInterval: NodeJS.Timeout | null = null;

      recognition.onstart = async () => {
        console.log('Speech recognition started successfully');
        setState(prev => ({ ...prev, isRecording: true, error: null }));
        
        // Start audio level monitoring
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContext = new AudioContext();
          analyser = audioContext.createAnalyser();
          microphone = audioContext.createMediaStreamSource(stream);
          
          analyser.fftSize = 256;
          microphone.connect(analyser);
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          audioLevelInterval = setInterval(() => {
            analyser!.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalizedLevel = Math.min(1, average / 128); // Normalize to 0-1
            
            setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
          }, 100);
          
        } catch (error) {
          console.warn('Could not set up audio level monitoring:', error);
        }
      };

      recognition.onresult = (event: any) => {
        console.log('Speech recognition result received:', event);
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence || 0.8;
          
          console.log('Transcript:', transcript, 'Confidence:', confidence);
            setState(prev => ({ 
            ...prev, 
            isRecording: false, 
            isProcessing: false,
            transcript,
            confidence,
            error: null,
            retryCount: 0 // Reset retry counter on success
          }));

          onTranscript(transcript);
        }
      };      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = `Speech recognition error: ${event.error}`;
        let shouldRetry = false;
        
        // Provide user-friendly error messages
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            shouldRetry = true;
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please enable microphone access.';
            break;          case 'network':
            errorMessage = 'Browser speech recognition network error. Trying alternative method...';
            console.log('Network error detected - browser speech recognition requires internet');
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was stopped.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please check browser settings.';
            break;
        }
          setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          isProcessing: false,
          error: errorMessage,
          audioLevel: 0
        }));
        
        // Clean up audio monitoring on error
        if (audioLevelInterval) {
          clearInterval(audioLevelInterval);
        }
        if (audioContext) {
          audioContext.close();
        }
        
        if (onError) {
          onError(errorMessage);
        }
          // Don't automatically restart on certain errors to prevent loops
        if (!shouldRetry) {
          console.log('Not retrying due to error type:', event.error);
          
          // For network errors, suggest fallback to AWS or text mode
          if (event.error === 'network') {
            console.log('Network error detected, browser speech recognition failed');            // Try AWS transcription as backup
            setTimeout(() => {
              console.log('Attempting AWS transcription as fallback...');
              setState(prev => ({ 
                ...prev, 
                error: 'Trying AWS transcription as backup...' 
              }));
              setShouldTryAWSFallback(true);
            }, 1000);
          }
        }
      };      recognition.onend = () => {
        console.log('Speech recognition ended');
        setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));
        
        // Clean up audio monitoring
        if (audioLevelInterval) {
          clearInterval(audioLevelInterval);
        }
        if (audioContext) {
          audioContext.close();
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();    } catch (error) {
      console.error('Failed to start browser speech recognition:', error);
      const errorMessage = 'Browser speech recognition failed to start. Please try the Text mode instead.';
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: errorMessage 
      }));
      
      if (onError) {
        onError(errorMessage);
      }    }
  }, [language, onTranscript, onError]);

  // Simple recording fallback for when speech recognition fails
  const startSimpleRecording = useCallback(async () => {
    try {
      console.log('Starting simple audio recording (manual transcription)...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Create a simple recorder
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // For now, just stop recording and show a message
        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          isProcessing: false,
          transcript: "Recording completed. Please type your message in the Text mode for now.",
          confidence: 0.5,
          error: null 
        }));

        // Provide the fallback message
        onTranscript("Recording completed. Please type your message in the Text mode for now.");

        // Clean up media stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Auto-stop after 10 seconds for simplicity
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 10000);

    } catch (error) {
      const errorMessage = 'Unable to access microphone. Please check permissions.';
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: errorMessage 
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onTranscript, onError]);
  const startAWSTranscription = useCallback(async () => {
    try {
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
    }
  }, [language, onTranscript, onError, medicalContext, voiceActivityDetection, vadHook]);
  const startRecording = useCallback(async () => {
    try {
      // Clear any pending timeouts
      if (realTimeTimeoutRef.current) {
        clearTimeout(realTimeTimeoutRef.current);
        realTimeTimeoutRef.current = null;
      }

      // Check retry limit to prevent endless loops
      if (state.retryCount >= 3) {
        const errorMessage = 'Speech recognition failed after multiple attempts. Please try the Text mode instead.';
        setState(prev => ({ 
          ...prev, 
          error: errorMessage,
          retryCount: 0 // Reset for next session
        }));
        if (onError) {
          onError(errorMessage);
        }
        return;
      }

      // Reset state
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: null,
        retryCount: prev.retryCount + 1
      }));      // Try browser-based speech recognition first (faster and more reliable)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      // If this is a fallback attempt due to network error, skip browser speech recognition
      if (shouldTryAWSFallback) {
        console.log('Skipping browser speech recognition due to previous network error, using AWS transcription');
        setShouldTryAWSFallback(false);
        return startAWSTranscription();
      }
      
      if (SpeechRecognition) {
        console.log('Using browser speech recognition (attempt', state.retryCount + 1, ')');
        return startBrowserSpeechRecognition(SpeechRecognition);
      }

      // Only use AWS transcription if browser speech recognition is not available
      console.log('Browser speech recognition not available, trying AWS transcription');
      return startAWSTranscription();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start speech recognition';
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: errorMessage 
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [startBrowserSpeechRecognition, startAWSTranscription, state.retryCount, shouldTryAWSFallback, onError]);

  const stopRecording = useCallback(() => {
    // Clear any pending timeouts
    if (realTimeTimeoutRef.current) {
      clearTimeout(realTimeTimeoutRef.current);
      realTimeTimeoutRef.current = null;
    }

    // Stop browser speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }

    // Stop AWS media recorder
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
      // Stop voice activity detection
    if (voiceActivityDetection && vadHook.isListening) {
      vadHook.stopListening();
    }
    
    setState(prev => ({ ...prev, isRecording: false, retryCount: 0 })); // Reset retry counter on manual stop
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
    // Also check for speech recognition support
    isSpeechSupported: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    // Expose voice activity detection state
    isVoiceDetected: vadHook.isVoiceDetected || state.isVoiceDetected,
    audioLevel: vadHook.volume || state.audioLevel
  };
};
