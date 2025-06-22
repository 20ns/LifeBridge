import { useState, useCallback, useRef } from 'react';
import { signToTranslation, batchSignProcessing } from '../services/awsService';

interface SignData {
  landmarks: any[];
  confidence: number;
  gesture: string;
  timestamp: number;
}

interface MLGestureResponse {
  gesture: string;
  confidence: number;
  medical_priority: 'critical' | 'high' | 'medium' | 'low';
  urgency_score: number;
  mode: 'ml' | 'fallback';
}

interface SignToTextMapping {
  [key: string]: {
    text: string;
    medicalPriority: 'critical' | 'high' | 'medium' | 'low';
    context: string[];
  };
}

// ML Gesture Recognition API endpoint
const ML_GESTURE_API_ENDPOINT = 'https://sevmuborah.execute-api.eu-north-1.amazonaws.com/prod/gesture-recognition-ml';

// Medical sign language to text mappings for emergency scenarios
const medicalSignMappings: SignToTextMapping = {
  'emergency': {
    text: 'EMERGENCY - I need immediate medical help',
    medicalPriority: 'critical',
    context: ['emergency', 'urgent']
  },
  'help': {
    text: 'I need help',
    medicalPriority: 'critical',
    context: ['emergency', 'general']
  },
  'pain': {
    text: 'I am experiencing pain',
    medicalPriority: 'high',
    context: ['consultation', 'emergency']
  },
  'medicine': {
    text: 'I need my medication',
    medicalPriority: 'high',
    context: ['medication', 'consultation']
  },
  'doctor': {
    text: 'I need to see a doctor',
    medicalPriority: 'high',
    context: ['consultation', 'emergency']
  },
  'water': {
    text: 'I need water',
    medicalPriority: 'medium',
    context: ['general', 'consultation']
  },
  'yes': {
    text: 'Yes',
    medicalPriority: 'medium',
    context: ['general', 'consultation', 'emergency']
  },
  'no': {
    text: 'No',
    medicalPriority: 'medium',
    context: ['general', 'consultation', 'emergency']
  }
};

export const useSignLanguageDetection = () => {
  console.log('[useSignLangDetection] Hook execution started/re-executed.'); // Log hook execution

  const [isActive, setIsActive] = useState(false);
  const [detectedSigns, setDetectedSigns] = useState<SignData[]>([]);
  const [currentText, setCurrentText] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [detectionHistory, setDetectionHistory] = useState<SignData[]>([]);
  const [mlMode, setMlMode] = useState<'ml' | 'fallback'>('fallback'); // Start in fallback mode
  const gestureStabilityRef = useRef<{[key: string]: number}>({});  // Enhanced ML gesture recognition function with fallback
  const recognizeGestureML = useCallback(async (landmarks: any[]): Promise<MLGestureResponse | null> => {
    // Skip ML API for now to avoid 0% confidence issues
    // Use only local gesture detection for better reliability
    console.log('[ML] Using fallback mode - ML API disabled for stability');
    return null;
  }, []);

  // Start sign language detection
  const startDetection = useCallback(() => {
    console.log('[useSignLangDetection] startDetection called. Current isActive:', isActive);
    setIsActive(true);
    console.log('[useSignLangDetection] setIsActive(true) called.');
    setDetectedSigns([]);
    setCurrentText('');
    gestureStabilityRef.current = {};
  }, [isActive]); // Added isActive to dependency array to log its current value

  // Stop sign language detection
  const stopDetection = useCallback(() => {
    console.log('[useSignLangDetection] stopDetection called. Current isActive:', isActive);
    setIsActive(false);
    console.log('[useSignLangDetection] setIsActive(false) called.');
  }, [isActive]); // Added isActive to dependency array
  // Enhanced sign detection handler with clean logic
  const handleSignDetected = useCallback(async (signData: SignData) => {
    const { landmarks, confidence, gesture: detectedGesture, timestamp } = signData;
    
    console.log(`[Hook] Processing detected gesture: ${detectedGesture} with confidence: ${Math.round(confidence * 100)}%`);
    
    // Get medical text mapping
    const signMapping = medicalSignMappings[detectedGesture];
    if (!signMapping) {
      console.warn(`Unknown gesture: ${detectedGesture}`);
      return;
    }

    // Create final sign data with mapped text
    const finalSignData = {
      ...signData,
      gesture: signMapping.text
    };
    
    // Update detection history
    setDetectionHistory(prev => [...prev.slice(-19), finalSignData]);
    
    // For emergency gestures, process immediately
    const isEmergency = signMapping.medicalPriority === 'critical';
    if (isEmergency) {
      console.log(`🚨 EMERGENCY DETECTED: ${detectedGesture} -> "${signMapping.text}"`);
      setCurrentText(signMapping.text);
      setConfidenceScore(confidence);
      setDetectedSigns(prev => [...prev, finalSignData]);
      return;
    }
    
    // For non-emergency gestures, check stability
    const now = Date.now();
    const lastDetection = gestureStabilityRef.current[detectedGesture];
    if (lastDetection && (now - lastDetection) < 1500) {
      return; // Too soon since last detection
    }
    
    gestureStabilityRef.current[detectedGesture] = now;
    
    // Update state
    setCurrentText(signMapping.text);
    setConfidenceScore(confidence);
    setDetectedSigns(prev => [...prev, finalSignData]);
    
    console.log(`✅ Gesture processed: ${detectedGesture} -> "${signMapping.text}" (${Math.round(confidence * 100)}%)`);
  }, []);

  // Get text from detected signs for translation
  const getTextForTranslation = useCallback(() => {
    if (detectedSigns.length === 0) return '';
    
    // Get the most recent sign or combine recent signs if appropriate
    const recentSigns = detectedSigns.slice(-3); // Last 3 signs
    
    // For medical emergencies, prioritize critical messages
    const criticalSigns = recentSigns.filter(sign => {
      const originalGesture = Object.keys(medicalSignMappings).find(
        key => medicalSignMappings[key].text === sign.gesture
      );
      return originalGesture && medicalSignMappings[originalGesture].medicalPriority === 'critical';
    });

    if (criticalSigns.length > 0) {
      return criticalSigns[criticalSigns.length - 1].gesture;
    }

    // Otherwise, return the most recent sign
    return recentSigns[recentSigns.length - 1].gesture;
  }, [detectedSigns]);

  // Clear detection history
  const clearHistory = useCallback(() => {
    setDetectedSigns([]);
    setDetectionHistory([]);
    setCurrentText('');
    setConfidenceScore(0);
    gestureStabilityRef.current = {};
  }, []);

  // Get medical context from detected signs
  const getMedicalContext = useCallback(() => {
    if (detectedSigns.length === 0) return 'general';
    
    const recentSigns = detectedSigns.slice(-5);
    const contexts = recentSigns.map(sign => {
      const originalGesture = Object.keys(medicalSignMappings).find(
        key => medicalSignMappings[key].text === sign.gesture
      );
      return originalGesture ? medicalSignMappings[originalGesture].context : ['general'];
    }).flat();

    // Determine primary context
    const contextCounts = contexts.reduce((acc, context) => {
      acc[context] = (acc[context] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});

    // Priority order for medical contexts
    const contextPriority = ['emergency', 'medication', 'consultation', 'general'];
    
    for (const context of contextPriority) {
      if (contextCounts[context] > 0) {
        return context;
      }
    }

    return 'general';
  }, [detectedSigns]);

  // Get detection statistics
  const getDetectionStats = useCallback(() => {
    const totalDetections = detectionHistory.length;
    const avgConfidence = detectionHistory.length > 0 
      ? detectionHistory.reduce((sum, sign) => sum + sign.confidence, 0) / detectionHistory.length
      : 0;
    
    const gestureDistribution = detectionHistory.reduce((acc, sign) => {
      acc[sign.gesture] = (acc[sign.gesture] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});

    return {
      totalDetections,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      gestureDistribution,
      sessionDuration: detectionHistory.length > 0 
        ? detectionHistory[detectionHistory.length - 1].timestamp - detectionHistory[0].timestamp
        : 0
    };
  }, [detectionHistory]);
  // Check if current signs indicate emergency
  const isEmergencyDetected = useCallback(() => {
    const recentSigns = detectedSigns.slice(-3);
    return recentSigns.some(sign => {
      const originalGesture = Object.keys(medicalSignMappings).find(
        key => medicalSignMappings[key].text === sign.gesture
      );
      return originalGesture && medicalSignMappings[originalGesture].medicalPriority === 'critical';
    });
  }, [detectedSigns]);

  // Translate single sign to target language
  const translateSign = useCallback(async (
    signData: { gesture: string; confidence: number; timestamp: number },
    targetLanguage: string = 'en'
  ) => {
    try {
      const result = await signToTranslation(signData, targetLanguage);
      return result;
    } catch (error) {
      console.error('Error translating sign:', error);
      return null;
    }
  }, []);

  // Process multiple signs and get combined translation
  const translateBatchSigns = useCallback(async (
    signs: Array<{ gesture: string; confidence: number; timestamp: number }>,
    targetLanguage: string = 'en'
  ) => {
    try {
      const result = await batchSignProcessing(signs, targetLanguage);
      return result;
    } catch (error) {
      console.error('Error processing batch signs:', error);
      return null;
    }
  }, []);

  // Get recent signs for batch processing
  const getRecentSignsForTranslation = useCallback((count: number = 5) => {
    return detectedSigns.slice(-count).map(sign => ({
      gesture: sign.gesture,
      confidence: sign.confidence,
      timestamp: sign.timestamp
    }));
  }, [detectedSigns]);  return {
    // State
    isActive,
    detectedSigns,
    currentText,
    confidenceScore,
    detectionHistory,
    mlMode,
    
    // Actions
    startDetection,
    stopDetection,
    handleSignDetected,
    clearHistory,
    recognizeGestureML,
    
    // Translation methods
    translateSign,
    translateBatchSigns,
    getRecentSignsForTranslation,
    
    // Utility functions
    getTextForTranslation,
    getMedicalContext,
    getDetectionStats,
    isEmergencyDetected,
    
    // Configuration
    medicalSignMappings
  };
};

export default useSignLanguageDetection;
