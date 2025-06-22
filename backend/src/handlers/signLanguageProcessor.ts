import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createResponse, createErrorResponse, validateRequestBody, validateSignLanguageData } from '../utils/response';
import { translateText } from '../services/bedrock';

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

// Helper function to verify a fist gesture from landmarks
const isFistGesture = (landmarks: any[]): boolean => {
 if (!landmarks || landmarks.length !== 21) return false;

 // Landmark indices for fingertips and major joints
 const fingerLandmarks = {
   thumb: { tip: 4, mcp: 2 },
   index: { tip: 8, mcp: 5 },
   middle: { tip: 12, mcp: 9 },
   ring: { tip: 16, mcp: 13 },
   pinky: { tip: 20, mcp: 17 }
 };

 // Check if each finger is folded by comparing the y-coordinate of the tip to the MCP joint.
 // For a folded finger, the tip should be below the MCP joint.
 const isFingerFolded = (tipIdx: number, mcpIdx: number): boolean => {
   if (!landmarks[tipIdx] || !landmarks[mcpIdx]) return false;
   return landmarks[tipIdx].y > landmarks[mcpIdx].y;
 };

 const thumbFolded = isFingerFolded(fingerLandmarks.thumb.tip, fingerLandmarks.thumb.mcp);
 const indexFolded = isFingerFolded(fingerLandmarks.index.tip, fingerLandmarks.index.mcp);
 const middleFolded = isFingerFolded(fingerLandmarks.middle.tip, fingerLandmarks.middle.mcp);
 const ringFolded = isFingerFolded(fingerLandmarks.ring.tip, fingerLandmarks.ring.mcp);
 const pinkyFolded = isFingerFolded(fingerLandmarks.pinky.tip, fingerLandmarks.pinky.mcp);

 const foldedCount = [thumbFolded, indexFolded, middleFolded, ringFolded, pinkyFolded].filter(Boolean).length;

 // A confirmed fist requires at least 4 fingers to be folded, including the thumb.
 return foldedCount >= 4 && thumbFolded;
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
  
  // For emergency gestures, perform an additional validation step
  if (gesture === 'emergency') {
   if (!isFistGesture(landmarks)) {
     // If the backend validation fails, downgrade the priority and adjust the text
     return {
       processedGesture: 'possible_emergency_mistake',
       medicalPriority: 'medium',
       translationText: 'Patient may be attempting a gesture, but it is not a clear emergency signal. Please verify.',
       recommendedActions: ['Assess patient for other signs of distress', 'Attempt to communicate through other means'],
       confidence: enhancedConfidence * 0.5, // Reduce confidence due to ambiguity
     };
   }
 }

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
    }    const validation = validateRequestBody(event.body, ['gesture', 'landmarks', 'confidence']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    // Additional validation for sign language specific data
    const signValidation = validateSignLanguageData(validation.data);
    if (!signValidation.isValid) {
      return createErrorResponse(400, signValidation.error!);
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
    });    // Return enhanced processing result
    return createResponse(200, {
      originalGesture: gesture,
      enhancedGesture: analysisResult.processedGesture,
      medicalPriority: analysisResult.medicalPriority,
      translationText: analysisResult.translationText,
      recommendedActions: analysisResult.recommendedActions,
      confidence: analysisResult.confidence,
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

// Connect sign language to translation pipeline
export const signToTranslation = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Sign-to-translation request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['gesture', 'landmarks', 'confidence', 'targetLanguage']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { gesture, landmarks, confidence, medicalContext, targetLanguage, sourceLanguage = 'en' } = validation.data;

    // First process the sign language gesture
    const signData: SignLanguageData = {
      landmarks,
      gesture,
      confidence,
      timestamp: Date.now(),
      medicalContext
    };

    const analysisResult = enhanceGestureAnalysis(gesture, landmarks, medicalContext);
    
    // Extract the text from sign language processing
    const textToTranslate = analysisResult.translationText;
    
    // If target language is English, just return the sign analysis
    if (targetLanguage.toLowerCase() === 'en' || targetLanguage.toLowerCase() === 'english') {
      return createResponse(200, {
        signAnalysis: analysisResult,
        translationResult: {
          translatedText: textToTranslate,
          sourceLanguage: 'en',
          targetLanguage: 'en',
          confidence: analysisResult.confidence
        },
        processingTimestamp: Date.now()
      }, 'Sign processed (no translation needed)');
    }

    // Translate the text to target language
    console.log(`Translating sign text: "${textToTranslate}" to ${targetLanguage}`);
    const translationResult = await translateText(
      textToTranslate, 
      sourceLanguage, 
      targetLanguage, 
      medicalContext || 'medical'
    );

    return createResponse(200, {
      signAnalysis: {
        originalGesture: gesture,
        enhancedGesture: analysisResult.processedGesture,
        medicalPriority: analysisResult.medicalPriority,
        translationText: analysisResult.translationText,
        recommendedActions: analysisResult.recommendedActions,
        confidence: analysisResult.confidence,
        medicalContext
      },
      translationResult: {
        ...translationResult,
        sourceText: textToTranslate
      },
      processingTimestamp: Date.now(),
      auditInfo: {
        signConfidence: analysisResult.confidence,
        translationConfidence: translationResult.confidence || 0.9,
        medicalPriority: analysisResult.medicalPriority,
        processingTime: Date.now() - signData.timestamp
      }
    }, 'Sign language translated successfully');

  } catch (error) {
    console.error('Sign-to-translation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Sign-to-translation failed', errorMessage);
  }
};

// Batch sign processing for continuous detection
export const batchSignProcessing = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Batch sign processing request:', JSON.stringify(event, null, 2));

  try {
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const { signSequence, medicalContext, targetLanguage = 'en' } = JSON.parse(event.body);

    if (!signSequence || !Array.isArray(signSequence) || signSequence.length === 0) {
      return createErrorResponse(400, 'Sign sequence is required and must be a non-empty array');
    }

    const processedSigns = [];
    const combinedText = [];
    let overallConfidence = 0;
    let highestPriority = 'low';

    for (const sign of signSequence) {
      const analysisResult = enhanceGestureAnalysis(sign.gesture, sign.landmarks, medicalContext);
      processedSigns.push({
        ...sign,
        analysis: analysisResult
      });
      
      combinedText.push(analysisResult.translationText);
      overallConfidence += analysisResult.confidence;
      
      // Update priority to highest found
      const priorities = ['low', 'medium', 'high', 'critical'];
      if (priorities.indexOf(analysisResult.medicalPriority) > priorities.indexOf(highestPriority)) {
        highestPriority = analysisResult.medicalPriority;
      }
    }

    overallConfidence = overallConfidence / signSequence.length;
    const fullText = combinedText.join('. ');

    // Translate combined text if needed
    let translationResult = null;
    if (targetLanguage.toLowerCase() !== 'en' && targetLanguage.toLowerCase() !== 'english') {
      translationResult = await translateText(
        fullText,
        'en',
        targetLanguage,
        medicalContext || 'medical'
      );
    }

    return createResponse(200, {
      processedSigns,
      combinedText: fullText,
      translationResult,
      overallConfidence,
      medicalPriority: highestPriority,
      processingTimestamp: Date.now(),
      signCount: signSequence.length
    }, 'Batch sign processing completed');

  } catch (error) {
    console.error('Batch sign processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Batch sign processing failed', errorMessage);
  }
};

// Export for testing
export { enhanceGestureAnalysis, calculateLandmarkConfidence, generateMedicalTranslationText };
