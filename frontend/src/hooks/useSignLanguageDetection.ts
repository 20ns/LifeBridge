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
const ML_GESTURE_API_ENDPOINT = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev/gesture-recognition-ml';

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
  const [mlMode, setMlMode] = useState<'ml' | 'fallback'>('fallback');
  const gestureStabilityRef = useRef<{[key: string]: number}>({});

  // Enhanced ML gesture recognition function
  const recognizeGestureML = useCallback(async (landmarks: any[]): Promise<MLGestureResponse | null> => {
    try {
      const response = await fetch(ML_GESTURE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landmarks: landmarks,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.status}`);
      }

      const result: MLGestureResponse = await response.json();
      setMlMode(result.mode);
      return result;
    } catch (error) {
      console.error('ML gesture recognition failed:', error);
      return null;
    }
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

  // Enhanced sign detection handler with ML integration
  const handleSignDetected = useCallback(async (signData: SignData) => {
    const { landmarks, confidence, timestamp } = signData;
    
    // Try ML recognition first
    const mlResult = await recognizeGestureML(landmarks);
    
    let finalGesture = signData.gesture;
    let finalConfidence = confidence;
    let medicalPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    
    if (mlResult) {
      finalGesture = mlResult.gesture;
      finalConfidence = mlResult.confidence;
      medicalPriority = mlResult.medical_priority;
      
      console.log(`ML Recognition: ${mlResult.gesture} (confidence: ${Math.round(mlResult.confidence * 100)}%, priority: ${mlResult.medical_priority}, mode: ${mlResult.mode})`);
    }
    
    const finalSignData = {
      ...signData,
      gesture: finalGesture,
      confidence: finalConfidence
    };
    
    // Update detection history
    setDetectionHistory(prev => [...prev.slice(-19), finalSignData]);
    
    // Check gesture stability (avoid rapid changes)
    const now = Date.now();
    if (gestureStabilityRef.current[finalGesture]) {
      const timeSinceLastDetection = now - gestureStabilityRef.current[finalGesture];
      if (timeSinceLastDetection < 2000) { // Wait 2 seconds between same gestures
        return;
      }
    }
    
    gestureStabilityRef.current[finalGesture] = now;
    
    // Get medical text mapping
    const mapping = medicalSignMappings[finalGesture];
    if (!mapping) {
      console.warn(`Unknown gesture: ${finalGesture}`);
      return;
    }

    // Update current text and confidence
    setCurrentText(mapping.text);
    setConfidenceScore(finalConfidence);
    
    // Add to detected signs
    setDetectedSigns(prev => [...prev, {
      ...finalSignData,
      gesture: mapping.text // Store the translated text
    }]);

    // Log for medical context
    console.log(`Sign detected: ${finalGesture} -> "${mapping.text}" (confidence: ${Math.round(finalConfidence * 100)}%)`);
  }, [recognizeGestureML]);

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
