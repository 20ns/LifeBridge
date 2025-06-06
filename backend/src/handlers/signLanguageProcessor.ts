import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';

interface SignLanguageData {
  landmarks: any[];
  gesture: string;
  confidence: number;
  timestamp: number;
  medicalContext?: string;
}

interface ProcessingResult {
  processedGesture: string;
  medicalPriority: 'critical' | 'high' | 'medium' | 'low';
  translationText: string;
  recommendedActions: string[];
  confidence: number;
}

// Medical priority mappings for sign language gestures
const medicalPriorityMap: { [key: string]: { priority: string; actions: string[] } } = {
  'emergency': {
    priority: 'critical',
    actions: [
      'Alert medical staff immediately',
      'Prepare for emergency response',
      'Document exact time of gesture',
      'Stay with patient'
    ]
  },
  'help': {
    priority: 'critical',
    actions: [
      'Respond immediately to patient request',
      'Assess patient condition',
      'Call for additional assistance if needed'
    ]
  },
  'pain': {
    priority: 'high',
    actions: [
      'Assess pain level and location',
      'Document pain characteristics',
      'Consider pain management options',
      'Monitor for changes'
    ]
  },
  'medicine': {
    priority: 'high',
    actions: [
      'Verify medication request',
      'Check medication schedule',
      'Confirm dosage and timing',
      'Document administration'
    ]
  },
  'doctor': {
    priority: 'high',
    actions: [
      'Contact attending physician',
      'Document patient request',
      'Prepare patient information for consultation'
    ]
  },
  'water': {
    priority: 'medium',
    actions: [
      'Verify if patient can safely consume fluids',
      'Check for dietary restrictions',
      'Provide appropriate hydration'
    ]
  },
  'yes': {
    priority: 'medium',
    actions: [
      'Acknowledge patient response',
      'Document affirmative response',
      'Continue with planned care'
    ]
  },
  'no': {
    priority: 'medium',
    actions: [
      'Acknowledge patient response',
      'Document refusal or negative response',
      'Discuss alternatives with patient'
    ]
  }
};

// Enhanced gesture analysis using medical context
const enhanceGestureAnalysis = (gesture: string, landmarks: any[], medicalContext?: string): ProcessingResult => {
  const basePriority = medicalPriorityMap[gesture] || { priority: 'low', actions: ['General assistance'] };
  
  // Calculate enhanced confidence based on medical context
  let enhancedConfidence = calculateLandmarkConfidence(landmarks);
  
  // Adjust confidence based on medical context
  if (medicalContext === 'emergency') {
    enhancedConfidence *= 1.2; // Boost confidence in emergency context
  } else if (medicalContext === 'consultation') {
    enhancedConfidence *= 1.1; // Slight boost in consultation context
  }
  
  enhancedConfidence = Math.min(1.0, enhancedConfidence); // Cap at 1.0
  
  // Generate medical-appropriate translation text
  const translationText = generateMedicalTranslationText(gesture, medicalContext);
  
  return {
    processedGesture: gesture,
    medicalPriority: basePriority.priority as any,
    translationText,
    recommendedActions: basePriority.actions,
    confidence: enhancedConfidence
  };
};

// Calculate confidence based on landmark stability and positioning
const calculateLandmarkConfidence = (landmarks: any[]): number => {
  if (!landmarks || landmarks.length !== 21) return 0;
  
  // Check landmark consistency
  let stabilityScore = 0;
  let positionScore = 0;
  
  // Analyze finger joint relationships
  const fingerTips = [4, 8, 12, 16, 20];
  const fingerBases = [2, 5, 9, 13, 17];
  
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    
    if (tip && base) {
      // Check if finger positions are anatomically reasonable
      const distance = Math.sqrt(
        Math.pow(tip.x - base.x, 2) + 
        Math.pow(tip.y - base.y, 2)
      );
      
      if (distance > 0.02 && distance < 0.3) { // Reasonable finger length
        positionScore += 0.2;
      }
      
      // Check for stability (z-depth consistency)
      if (tip.z && base.z && Math.abs(tip.z - base.z) < 0.1) {
        stabilityScore += 0.2;
      }
    }
  }
  
  return Math.min(1.0, (stabilityScore + positionScore) / 2);
};

// Generate medical-appropriate translation text
const generateMedicalTranslationText = (gesture: string, medicalContext?: string): string => {
  const baseTexts: { [key: string]: string } = {
    'emergency': 'EMERGENCY - I need immediate medical help',
    'help': 'I need assistance',
    'pain': 'I am experiencing pain',
    'medicine': 'I need my medication',
    'doctor': 'I need to see a doctor',
    'water': 'I need water',
    'yes': 'Yes',
    'no': 'No'
  };
  
  let baseText = baseTexts[gesture] || `Patient gesture: ${gesture}`;
  
  // Add context-specific prefix for medical scenarios
  if (medicalContext === 'emergency') {
    baseText = `URGENT: ${baseText}`;
  } else if (medicalContext === 'consultation') {
    baseText = `Patient indicates: ${baseText}`;
  } else if (medicalContext === 'medication') {
    baseText = `Medication request: ${baseText}`;
  }
  
  return baseText;
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Sign language processing request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    // Validate request method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }    // Validate request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['gesture', 'landmarks', 'confidence']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { gesture, landmarks, confidence, medicalContext, timestamp } = validation.data;

    // Create sign language data object
    const signData: SignLanguageData = {
      landmarks,
      gesture,
      confidence,
      timestamp: timestamp || Date.now(),
      medicalContext
    };

    console.log(`Processing sign language gesture: ${gesture} with confidence: ${confidence}`);

    // Enhanced gesture analysis
    const analysisResult = enhanceGestureAnalysis(gesture, landmarks, medicalContext);

    // Log for medical audit trail
    console.log(`Medical sign analysis complete:`, {
      gesture: analysisResult.processedGesture,
      priority: analysisResult.medicalPriority,
      confidence: analysisResult.confidence,
      context: medicalContext,
      timestamp: signData.timestamp
    });

    // Return enhanced processing result
    return createResponse(200, {
      originalGesture: gesture,
      processedData: analysisResult,
      medicalContext,
      processingTimestamp: Date.now(),
      auditInfo: {
        confidence: analysisResult.confidence,
        priority: analysisResult.medicalPriority,
        actionsRecommended: analysisResult.recommendedActions.length
      }
    }, 'Sign language gesture processed successfully');

  } catch (error) {
    console.error('Sign language processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Sign language processing failed', errorMessage);
  }
};

// Export for testing
export { enhanceGestureAnalysis, calculateLandmarkConfidence, generateMedicalTranslationText };
