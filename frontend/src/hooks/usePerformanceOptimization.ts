import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  translationLatency: number;
  speechRecognitionLatency: number;
  signDetectionLatency: number;
  cacheHitRate: number;
  networkLatency: number;
  batteryLevel: number;
  memoryUsage: number;
  connectionType: string;
  offlineMode: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceHookOptions {
  enableCaching?: boolean;
  cacheTimeout?: number; // in milliseconds
  maxCacheSize?: number;
  enableMetrics?: boolean;
  enableNetworkMonitoring?: boolean;
}

export const usePerformanceOptimization = (options: PerformanceHookOptions = {}) => {
  const {
    enableCaching = true,
    cacheTimeout = 300000, // 5 minutes
    maxCacheSize = 100,
    enableMetrics = true,
    enableNetworkMonitoring = true
  } = options;

  // Performance metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    translationLatency: 0,
    speechRecognitionLatency: 0,
    signDetectionLatency: 0,
    cacheHitRate: 0,
    networkLatency: 0,
    batteryLevel: 100,
    memoryUsage: 0,
    connectionType: 'unknown',
    offlineMode: false
  });

  // Cache management
  const cache = useRef<Map<string, CacheEntry<any>>>(new Map());
  const performanceTimers = useRef<Map<string, number>>(new Map());
  const cacheStats = useRef({ hits: 0, misses: 0 });
  // Network quality monitoring
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('excellent');
  const networkTestInterval = useRef<NodeJS.Timeout | null>(null);

  // Cache management functions
  const getCacheKey = (operation: string, params: any): string => {
    return `${operation}_${JSON.stringify(params)}`;
  };

  const getCachedResult = useCallback(<T>(key: string): T | null => {
    if (!enableCaching) return null;

    const entry = cache.current.get(key);
    if (!entry) {
      cacheStats.current.misses++;
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > cacheTimeout) {
      cache.current.delete(key);
      cacheStats.current.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.timestamp = Date.now(); // Update timestamp for LRU
    cacheStats.current.hits++;

    // Update cache hit rate
    const totalAccess = cacheStats.current.hits + cacheStats.current.misses;
    const hitRate = (cacheStats.current.hits / totalAccess) * 100;
    setMetrics(prev => ({ ...prev, cacheHitRate: Math.round(hitRate) }));

    return entry.data;
  }, [enableCaching, cacheTimeout]);

  const setCachedResult = useCallback(<T>(key: string, data: T, priority: 'high' | 'medium' | 'low' = 'medium'): void => {
    if (!enableCaching) return;

    // If cache is full, remove least recently used items
    if (cache.current.size >= maxCacheSize) {
      const entries = Array.from(cache.current.entries());
      // Sort by timestamp (oldest first) and priority (low priority first)
      entries.sort((a, b) => {
        if (a[1].priority !== b[1].priority) {
          const priorityOrder = { low: 0, medium: 1, high: 2 };
          return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
        }
        return a[1].timestamp - b[1].timestamp;
      });

      // Remove the oldest, lowest priority entry
      const [keyToRemove] = entries[0];
      cache.current.delete(keyToRemove);
    }

    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      priority
    });
  }, [enableCaching, maxCacheSize]);

  // Performance timing functions
  const startPerformanceTimer = useCallback((operation: string): void => {
    if (!enableMetrics) return;
    performanceTimers.current.set(operation, performance.now());
  }, [enableMetrics]);

  const endPerformanceTimer = useCallback((operation: string): number => {
    if (!enableMetrics) return 0;

    const startTime = performanceTimers.current.get(operation);
    if (!startTime) return 0;

    const endTime = performance.now();
    const duration = endTime - startTime;
    performanceTimers.current.delete(operation);

    // Update metrics based on operation type
    setMetrics(prev => ({
      ...prev,
      [`${operation}Latency`]: Math.round(duration)
    }));

    return duration;
  }, [enableMetrics]);

  // Network quality assessment
  const testNetworkQuality = useCallback(async (): Promise<void> => {
    if (!enableNetworkMonitoring) return;

    try {
      const startTime = performance.now();
      
      // Test with a small image to measure network speed
      const testImage = new Image();
      testImage.onload = () => {
        const endTime = performance.now();
        const latency = endTime - startTime;

        setMetrics(prev => ({ ...prev, networkLatency: Math.round(latency) }));

        // Determine connection quality based on latency
        let quality: 'excellent' | 'good' | 'poor' | 'offline';
        if (latency < 100) quality = 'excellent';
        else if (latency < 300) quality = 'good';
        else quality = 'poor';

        setConnectionQuality(quality);
      };

      testImage.onerror = () => {
        setConnectionQuality('offline');
        setMetrics(prev => ({ ...prev, offlineMode: true }));
      };

      // Use a timestamp to avoid caching
      testImage.src = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?t=${Date.now()}`;
    } catch (error) {
      console.warn('Network quality test failed:', error);
      setConnectionQuality('poor');
    }
  }, [enableNetworkMonitoring]);

  // Monitor system resources
  const monitorSystemResources = useCallback((): void => {
    if (!enableMetrics) return;

    try {
      // Battery API (if available)
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setMetrics(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100)
          }));
        });
      }

      // Memory API (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }

      // Connection API (if available)
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setMetrics(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown'
        }));
      }

      // Online/offline status
      setMetrics(prev => ({
        ...prev,
        offlineMode: !navigator.onLine
      }));
    } catch (error) {
      console.warn('System resource monitoring failed:', error);
    }
  }, [enableMetrics]);

  // Optimize for mobile devices
  const optimizeForMobile = useCallback((): boolean => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth < 768;
    
    if (isMobile) {
      // Reduce cache size for mobile
      if (cache.current.size > 50) {
        const entries = Array.from(cache.current.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Keep only the most recent 50 entries
        const toKeep = entries.slice(-50);
        cache.current.clear();
        toKeep.forEach(([key, value]) => cache.current.set(key, value));
      }
    }

    return isMobile;
  }, []);

  // Clear cache function
  const clearCache = useCallback((): void => {
    cache.current.clear();
    cacheStats.current = { hits: 0, misses: 0 };
    setMetrics(prev => ({ ...prev, cacheHitRate: 0 }));
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      size: cache.current.size,
      hits: cacheStats.current.hits,
      misses: cacheStats.current.misses,
      hitRate: metrics.cacheHitRate
    };
  }, [metrics.cacheHitRate]);

  // Preload critical resources
  const preloadCriticalResources = useCallback((resources: string[]): void => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  // Initialize monitoring
  useEffect(() => {
    if (enableNetworkMonitoring) {
      // Initial network test
      testNetworkQuality();
      
      // Periodic network quality tests
      networkTestInterval.current = setInterval(testNetworkQuality, 10000); // Every 10 seconds
    }

    // Initial system resource check
    monitorSystemResources();
    
    // Periodic system monitoring
    const systemInterval = setInterval(monitorSystemResources, 5000); // Every 5 seconds

    // Online/offline event listeners
    const handleOnline = () => {
      setMetrics(prev => ({ ...prev, offlineMode: false }));
      setConnectionQuality('good');
      testNetworkQuality();
    };

    const handleOffline = () => {
      setMetrics(prev => ({ ...prev, offlineMode: true }));
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      if (networkTestInterval.current) {
        clearInterval(networkTestInterval.current);
      }
      clearInterval(systemInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableNetworkMonitoring, testNetworkQuality, monitorSystemResources]);

  // Mobile optimization on mount and resize
  useEffect(() => {
    optimizeForMobile();
    
    const handleResize = () => optimizeForMobile();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [optimizeForMobile]);

  return {
    // Performance metrics
    metrics,
    connectionQuality,
    
    // Cache management
    getCachedResult,
    setCachedResult,
    clearCache,
    getCacheStats,
    
    // Performance timing
    startPerformanceTimer,
    endPerformanceTimer,
    
    // Network and system monitoring
    testNetworkQuality,
    monitorSystemResources,
    optimizeForMobile,
    
    // Resource management
    preloadCriticalResources,
    
    // Utility functions
    isMobile: optimizeForMobile(),
    isOnline: !metrics.offlineMode
  };
};
