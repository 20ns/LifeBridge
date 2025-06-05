import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceActivityDetectionProps {
  onVoiceStart: () => void;
  onVoiceEnd: () => void;
  onVolumeChange: (volume: number) => void;
  sensitivity?: number; // 0.0 to 1.0
  enabled?: boolean;
}

interface VoiceActivityState {
  isVoiceDetected: boolean;
  volume: number;
  isListening: boolean;
  error: string | null;
}

export const useVoiceActivityDetection = ({
  onVoiceStart,
  onVoiceEnd,
  onVolumeChange,
  sensitivity = 0.3,
  enabled = true
}: VoiceActivityDetectionProps) => {
  const [state, setState] = useState<VoiceActivityState>({
    isVoiceDetected: false,
    volume: 0,
    isListening: false,
    error: null
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const voiceDetectedRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice activity detection algorithm
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !enabled) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for volume detection
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);
    const volume = rms / 255; // Normalize to 0-1

    setState(prev => ({ ...prev, volume }));
    onVolumeChange(volume);

    // Voice activity detection based on volume and frequency analysis
    const isVoiceActive = volume > sensitivity;

    // Detect voice start
    if (isVoiceActive && !voiceDetectedRef.current) {
      voiceDetectedRef.current = true;
      setState(prev => ({ ...prev, isVoiceDetected: true }));
      onVoiceStart();
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }

    // Detect voice end (with debounce)
    if (!isVoiceActive && voiceDetectedRef.current) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      // Wait for 1 second of silence before declaring voice end
      silenceTimeoutRef.current = setTimeout(() => {
        voiceDetectedRef.current = false;
        setState(prev => ({ ...prev, isVoiceDetected: false }));
        onVoiceEnd();
      }, 1000);
    }

    // Continue analysis
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [sensitivity, enabled, onVoiceStart, onVoiceEnd, onVolumeChange]);

  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, isListening: true }));

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start analysis
      analyzeAudio();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isListening: false 
      }));
    }
  }, [analyzeAudio]);

  const stopListening = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear timers
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Reset state
    voiceDetectedRef.current = false;
    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      isVoiceDetected: false, 
      volume: 0 
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  };
};
