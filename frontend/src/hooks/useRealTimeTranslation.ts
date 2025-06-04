import { useState, useEffect, useRef, useCallback } from 'react';

interface RealTimeTranslationHookProps {
  sourceLanguage: string;
  targetLanguage: string;
  context?: 'emergency' | 'consultation' | 'medication' | 'general';
}

interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedLanguage?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export const useRealTimeTranslation = ({
  sourceLanguage,
  targetLanguage,
  context = 'general'
}: RealTimeTranslationHookProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const translationQueueRef = useRef<string[]>([]);

  // WebSocket connection management
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // For development, we'll simulate WebSocket with HTTP polling
      // In production, this would be a real WebSocket connection to API Gateway
      setIsConnected(true);
      setError(null);
      console.log('Real-time translation connected');
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      setError('Failed to connect to real-time translation service');
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    console.log('Real-time translation disconnected');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Real-time translation function
  const translateRealTime = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }

    // Add to queue to prevent rapid-fire requests
    translationQueueRef.current.push(text);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsTyping(true);
    setError(null);

    // Debounce translation requests
    typingTimeoutRef.current = setTimeout(async () => {
      const textToTranslate = translationQueueRef.current[translationQueueRef.current.length - 1];
      translationQueueRef.current = [];
      
      if (!textToTranslate || textToTranslate.length < 3) {
        setIsTyping(false);
        return;
      }

      setIsTranslating(true);
      
      try {
        // Use the existing translateText function with enhanced medical context
        const response = await fetch('http://localhost:3001/dev/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToTranslate,
            sourceLanguage,
            targetLanguage,
            context
          })
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.statusText}`);
        }

        const result = await response.json();
        setLastTranslation(result.data);
        
      } catch (err) {
        console.error('Real-time translation error:', err);
        setError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        setIsTranslating(false);
        setIsTyping(false);
      }
    }, 1000); // 1 second debounce

  }, [sourceLanguage, targetLanguage, context]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((text: string) => {
    if (text.length > 0) {
      setIsTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Auto-translate after typing stops
      translateRealTime(text);
    } else {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [translateRealTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isTranslating,
    isTyping,
    lastTranslation,
    error,
    translateRealTime,
    sendTypingIndicator,
    connect,
    disconnect
  };
};
