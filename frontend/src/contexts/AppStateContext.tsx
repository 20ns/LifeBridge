import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Define the state interface
interface AppState {
  // UI state
  activeMode: 'text' | 'speech' | 'sign' | 'emergency';
  isEmergencyMode: boolean;
  isTransitioning: boolean;
  isListening: boolean;
  showPerformancePanel: boolean;
  
  // Translation state
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  
  // Emergency state
  selectedEmergencyCategory: string | null;
  emergencyPhrasesLoading: boolean;
  
  // Performance state
  performanceMode: 'standard' | 'optimized';
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  
  // Accessibility state
  largeButtons: boolean;
  accessibilityMode: boolean;
  currentTheme: 'light' | 'dark' | 'high-contrast';
  textSize: 'small' | 'medium' | 'large';
  
  // Audio state
  isSpeaking: boolean;
  audioEnabled: boolean;
  
  // Sign language state
  signLanguageDetectionEnabled: boolean;
  isProcessingGestures: boolean;
  
  // Notification state
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  }>;
}

// Define action types
type AppAction =
  | { type: 'SET_ACTIVE_MODE'; payload: AppState['activeMode'] }
  | { type: 'SET_EMERGENCY_MODE'; payload: boolean }
  | { type: 'SET_TRANSITIONING'; payload: boolean }
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'SET_PERFORMANCE_PANEL'; payload: boolean }
  | { type: 'SET_TRANSLATED_TEXT'; payload: string }
  | { type: 'SET_SOURCE_LANGUAGE'; payload: string }
  | { type: 'SET_TARGET_LANGUAGE'; payload: string }
  | { type: 'SWAP_LANGUAGES' }
  | { type: 'SET_EMERGENCY_CATEGORY'; payload: string | null }
  | { type: 'SET_EMERGENCY_PHRASES_LOADING'; payload: boolean }
  | { type: 'SET_PERFORMANCE_MODE'; payload: AppState['performanceMode'] }
  | { type: 'SET_CONNECTION_QUALITY'; payload: AppState['connectionQuality'] }
  | { type: 'SET_LARGE_BUTTONS'; payload: boolean }
  | { type: 'SET_ACCESSIBILITY_MODE'; payload: boolean }
  | { type: 'SET_CURRENT_THEME'; payload: AppState['currentTheme'] }
  | { type: 'SET_TEXT_SIZE'; payload: AppState['textSize'] }
  | { type: 'SET_SPEAKING'; payload: boolean }
  | { type: 'SET_AUDIO_ENABLED'; payload: boolean }
  | { type: 'SET_SIGN_LANGUAGE_DETECTION'; payload: boolean }
  | { type: 'SET_PROCESSING_GESTURES'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AppState['notifications'][0], 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  activeMode: 'text',
  isEmergencyMode: false,
  isTransitioning: false,
  isListening: false,
  showPerformancePanel: false,
  translatedText: '',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  selectedEmergencyCategory: null,
  emergencyPhrasesLoading: false,
  performanceMode: 'optimized',
  connectionQuality: 'excellent',
  largeButtons: false,
  accessibilityMode: false,
  currentTheme: 'light',
  textSize: 'medium',
  isSpeaking: false,
  audioEnabled: true,
  signLanguageDetectionEnabled: true,
  isProcessingGestures: false,
  notifications: []
};

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_ACTIVE_MODE':
      return { ...state, activeMode: action.payload };
      
    case 'SET_EMERGENCY_MODE':
      return { ...state, isEmergencyMode: action.payload };
      
    case 'SET_TRANSITIONING':
      return { ...state, isTransitioning: action.payload };
      
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
      
    case 'SET_PERFORMANCE_PANEL':
      return { ...state, showPerformancePanel: action.payload };
      
    case 'SET_TRANSLATED_TEXT':
      return { ...state, translatedText: action.payload };
      
    case 'SET_SOURCE_LANGUAGE':
      return { ...state, sourceLanguage: action.payload };
      
    case 'SET_TARGET_LANGUAGE':
      return { ...state, targetLanguage: action.payload };
      
    case 'SWAP_LANGUAGES':
      return {
        ...state,
        sourceLanguage: state.targetLanguage,
        targetLanguage: state.sourceLanguage
      };
      
    case 'SET_EMERGENCY_CATEGORY':
      return { ...state, selectedEmergencyCategory: action.payload };
      
    case 'SET_EMERGENCY_PHRASES_LOADING':
      return { ...state, emergencyPhrasesLoading: action.payload };
      
    case 'SET_PERFORMANCE_MODE':
      return { ...state, performanceMode: action.payload };
      
    case 'SET_CONNECTION_QUALITY':
      return { ...state, connectionQuality: action.payload };
      
    case 'SET_LARGE_BUTTONS':
      return { ...state, largeButtons: action.payload };
      
    case 'SET_ACCESSIBILITY_MODE':
      return { ...state, accessibilityMode: action.payload };
      
    case 'SET_CURRENT_THEME':
      return { ...state, currentTheme: action.payload };
      
    case 'SET_TEXT_SIZE':
      return { ...state, textSize: action.payload };
      
    case 'SET_SPEAKING':
      return { ...state, isSpeaking: action.payload };
      
    case 'SET_AUDIO_ENABLED':
      return { ...state, audioEnabled: action.payload };
      
    case 'SET_SIGN_LANGUAGE_DETECTION':
      return { ...state, signLanguageDetectionEnabled: action.payload };
      
    case 'SET_PROCESSING_GESTURES':
      return { ...state, isProcessingGestures: action.payload };
      
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
          }
        ]
      };
      
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
      
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
      
    case 'RESET_STATE':
      return initialState;
      
    default:
      return state;
  }
};

// Context interface
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience methods for common actions
  setActiveMode: (mode: AppState['activeMode']) => void;
  setEmergencyMode: (enabled: boolean) => void;
  setLanguages: (source: string, target: string) => void;
  swapLanguages: () => void;
  addNotification: (message: string, type: AppState['notifications'][0]['type']) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Create context
const AppContext = createContext<AppContextValue | null>(null);

// Custom hook
export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// Provider component
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const setActiveMode = (mode: AppState['activeMode']) => {
    dispatch({ type: 'SET_ACTIVE_MODE', payload: mode });
  };

  const setEmergencyMode = (enabled: boolean) => {
    dispatch({ type: 'SET_EMERGENCY_MODE', payload: enabled });
  };

  const setLanguages = (source: string, target: string) => {
    dispatch({ type: 'SET_SOURCE_LANGUAGE', payload: source });
    dispatch({ type: 'SET_TARGET_LANGUAGE', payload: target });
  };

  const swapLanguages = () => {
    dispatch({ type: 'SWAP_LANGUAGES' });
  };

  const addNotification = (message: string, type: AppState['notifications'][0]['type']) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { message, type } });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const contextValue: AppContextValue = {
    state,
    dispatch,
    setActiveMode,
    setEmergencyMode,
    setLanguages,
    swapLanguages,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppStateProvider;
