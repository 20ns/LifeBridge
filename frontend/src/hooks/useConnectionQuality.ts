import { useState, useEffect } from 'react';

export interface ConnectionQuality {
  status: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number;
  strength: number;
  timestamp: number;
}

export const useConnectionQuality = () => {
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    status: 'excellent',
    latency: 50,
    strength: 100,
    timestamp: Date.now(),
  });

  const [offlineMode, setOfflineMode] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const monitorConnection = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      if (connection) {
        const quality: ConnectionQuality = {
          status:
            connection.effectiveType === '4g'
              ? 'excellent'
              : connection.effectiveType === '3g'
              ? 'good'
              : connection.effectiveType === '2g'
              ? 'poor'
              : 'offline',
          latency: connection.rtt || 50,
          strength: Math.min(100, (connection.downlink || 1) * 20),
          timestamp: Date.now(),
        };
        setConnectionQuality(quality);
      }

      setOfflineMode(!navigator.onLine);
    };

    monitorConnection();

    const interval = setInterval(monitorConnection, 5000);
    window.addEventListener('online', monitorConnection);
    window.addEventListener('offline', monitorConnection);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', monitorConnection);
      window.removeEventListener('offline', monitorConnection);
    };
  }, []);

  return { connectionQuality, offlineMode };
}; 