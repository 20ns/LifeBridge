import { useState, useCallback, useRef } from 'react';

export interface PerformanceMetrics {
  translationLatency: number;
  speechRecognitionLatency: number;
  signDetectionLatency: number;
  cacheHitRate: number;
}

export const usePerformanceMetrics = (initialCacheHit: number = 85) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    translationLatency: 0,
    speechRecognitionLatency: 0,
    signDetectionLatency: 0,
    cacheHitRate: initialCacheHit,
  });

  const DEBUG = false;
  const performanceTimers = useRef<Map<string, number>>(new Map());

  const trackPerformance = useCallback((operation: string, startTime: number) => {
    const endTime = Date.now();
    const latency = endTime - startTime;

    setPerformanceMetrics(prev => ({
      ...prev,
      [`${operation}Latency`]: latency,
    }));

    if (DEBUG) console.log(`${operation} completed in ${latency}ms`);
  }, []);

  const incrementCacheHit = useCallback(() => {
    setPerformanceMetrics(prev => ({
      ...prev,
      cacheHitRate: Math.min(100, prev.cacheHitRate + 1),
    }));
  }, []);

  return { performanceMetrics, trackPerformance, incrementCacheHit };
}; 