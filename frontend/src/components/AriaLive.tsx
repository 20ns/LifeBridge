import React, { useEffect, useState, useCallback } from 'react';
import './AriaLive.css';

export type AriaLivePriority = 'polite' | 'assertive' | 'off';

interface AriaLiveMessage {
  id: string;
  message: string;
  priority: AriaLivePriority;
  timestamp: number;
}

interface AriaLiveContextValue {
  announce: (message: string, priority?: AriaLivePriority) => void;
  clearMessages: () => void;
}

const AriaLiveContext = React.createContext<AriaLiveContextValue | null>(null);

// Hook for using the AriaLive system
export const useAriaLive = () => {
  const context = React.useContext(AriaLiveContext);
  if (!context) {
    throw new Error('useAriaLive must be used within an AriaLiveProvider');
  }
  return context;
};

// Provider component that manages aria-live regions
export const AriaLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<AriaLiveMessage[]>([]);

  const announce = useCallback((message: string, priority: AriaLivePriority = 'polite') => {
    const newMessage: AriaLiveMessage = {
      id: `aria-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      priority,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);

    // Clear the message after it's been announced (3 seconds for polite, 5 for assertive)
    const timeout = priority === 'assertive' ? 5000 : 3000;
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    }, timeout);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Group messages by priority
  const politeMessages = messages.filter(msg => msg.priority === 'polite');
  const assertiveMessages = messages.filter(msg => msg.priority === 'assertive');

  const contextValue: AriaLiveContextValue = {
    announce,
    clearMessages
  };

  return (
    <AriaLiveContext.Provider value={contextValue}>
      {children}
      
      {/* Aria-live regions for announcements */}
      <div className="aria-live-regions">
        {/* Polite announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true"
          className="aria-live-region aria-live-polite"
        >
          {politeMessages.map(msg => (
            <div key={msg.id} className="aria-live-message">
              {msg.message}
            </div>
          ))}
        </div>

        {/* Assertive announcements for emergencies */}
        <div 
          aria-live="assertive" 
          aria-atomic="true"
          className="aria-live-region aria-live-assertive"
        >
          {assertiveMessages.map(msg => (
            <div key={msg.id} className="aria-live-message">
              {msg.message}
            </div>
          ))}
        </div>
      </div>
    </AriaLiveContext.Provider>
  );
};

// Visual notification component (optional, for users who can see)
interface VisualNotificationProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  isVisible: boolean;
  onDismiss?: () => void;
}

export const VisualNotification: React.FC<VisualNotificationProps> = ({
  message,
  type = 'info',
  isVisible,
  onDismiss
}) => {
  useEffect(() => {
    if (isVisible && onDismiss) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className={`visual-notification visual-notification-${type}`}>
      <div className="notification-content">
        <span className="notification-message">{message}</span>
        {onDismiss && (
          <button
            className="notification-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Hook for managing visual notifications
export const useVisualNotification = () => {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isVisible: boolean;
  } | null>(null);

  const showNotification = useCallback((
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    setNotification({ message, type, isVisible: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => prev ? { ...prev, isVisible: false } : null);
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
};

export default AriaLiveProvider;
