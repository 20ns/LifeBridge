import { useState, useEffect, useRef, useCallback } from 'react';

export interface Notification {
  id: number;
  message: string;
  isVisible: boolean;
  isLeaving: boolean;
}

export const useNotifications = () => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const currentNotificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    currentNotificationRef.current = currentNotification;
  }, [currentNotification]);

  const addNotification = useCallback((message: string) => {
    const newNotification: Notification = {
      id: Date.now() + Math.random(),
      message,
      isVisible: false,
      isLeaving: false,
    };

    // If there's an active notification, start fade-out first
    if (currentNotificationRef.current) {
      setCurrentNotification(prev => (prev ? { ...prev, isLeaving: true } : null));
      setTimeout(() => {
        setCurrentNotification({ ...newNotification, isVisible: true });
      }, 300); // wait for fade-out
    } else {
      setCurrentNotification(newNotification);
      setTimeout(() => {
        setCurrentNotification(prev => (prev ? { ...prev, isVisible: true } : null));
      }, 50);
    }

    // Auto-remove after 5 s
    setTimeout(() => {
      setCurrentNotification(prev => (prev && prev.id === newNotification.id ? { ...prev, isLeaving: true } : prev));
      setTimeout(() => {
        setCurrentNotification(prev => (prev && prev.id === newNotification.id ? null : prev));
      }, 300);
    }, 5000);
  }, []);

  return { currentNotification, addNotification };
}; 