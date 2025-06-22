import { useState, useCallback, useRef, useEffect } from 'react';

interface SignData {
  landmarks: any[];
  confidence: number;
  gesture: string;
  timestamp: number;
}

interface SignToTextMapping {
  [key: string]: {
    text: string;
    medicalPriority: 'critical' | 'high' | 'medium' | 'low';
    context: string[];
  };
}

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
  const [isActive, setIsActive] = useState(false);
  const [detectedSigns, setDetectedSigns] = useState<SignData[]>([]);
  const [currentText, setCurrentText] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [detectionHistory, setDetectionHistory] = useState<SignData[]>([]);
  const gestureStabilityRef = useRef<{[key: string]: number}>({});

  // Start sign language detection
  const startDetection = useCallback(() => {
    setIsActive(true);
    setDetectedSigns([]);
    setCurrentText('');
    gestureStabilityRef.current = {};
  }, []);

  // Stop sign language detection
  const stopDetection = useCallback(() => {
    setIsActive(false);
  }, []);

  // Process detected sign and convert to text
  const handleSignDetected = useCallback((signData: SignData) => {
    const { gesture, confidence, timestamp } = signData;
    
    // Update detection history
    setDetectionHistory(prev => [...prev.slice(-19), signData]); // Keep last 20 detections
    
    // Check gesture stability (avoid rapid changes)
    const now = Date.now();
    if (gestureStabilityRef.current[gesture]) {
      const timeSinceLastDetection = now - gestureStabilityRef.current[gesture];
      if (timeSinceLastDetection < 2000) { // Wait 2 seconds between same gestures
        return;
      }
    }
    
    gestureStabilityRef.current[gesture] = now;
    
    // Get medical text mapping
    const mapping = medicalSignMappings[gesture];
    if (!mapping) {
      console.warn(`Unknown gesture: ${gesture}`);
      return;
    }

    // Update current text and confidence
    setCurrentText(mapping.text);
    setConfidenceScore(confidence);
    
    // Add to detected signs
    setDetectedSigns(prev => [...prev, {
      ...signData,
      gesture: mapping.text // Store the translated text
    }]);

    // Log for medical context
    console.log(`Sign detected: ${gesture} -> "${mapping.text}" (confidence: ${Math.round(confidence * 100)}%)`);
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

  return {
    // State
    isActive,
    detectedSigns,
    currentText,
    confidenceScore,
    detectionHistory,
    
    // Actions
    startDetection,
    stopDetection,
    handleSignDetected,
    clearHistory,
    
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
