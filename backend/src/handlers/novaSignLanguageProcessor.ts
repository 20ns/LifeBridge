import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION, BEDROCK_MODEL_ID } from '../config';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

interface SignLanguageRequest {
  landmarks: any[];
  gesture: string;
  confidence: number;
  timestamp: number;
  medicalContext?: string;
}

interface NovaSignLanguageResponse {
  gesture: string;
  confidence: number;
  medicalPriority: 'critical' | 'high' | 'medium' | 'low';
  urgencyScore: number;
  description: string;
  recommendedActions: string[];
  translationText: string;
  timestamp: number;
}

// Convert basic gesture detection to descriptive text for Nova Micro
function createGestureDescription(gesture: string, landmarks: any[], confidence: number): string {
  const descriptions: { [key: string]: string } = {
    'emergency': 'closed fist held up at chest level, shaking slightly',
    'help': 'open palm raised, pointing to themselves or medical staff',
    'pain': 'both hands pressed against chest or body area, facial expression showing distress',
    'medicine': 'fingers pinched together in pill-taking gesture',
    'water': 'cupped hand brought to mouth in drinking gesture',
    'yes': 'thumbs up gesture',
    'no': 'thumbs down gesture or head shaking motion',
    'doctor': 'pointing gesture toward medical staff or examination equipment'
  };

  const baseDescription = descriptions[gesture] || `hand gesture detected as "${gesture}"`;
  
  // Add confidence and landmark context
  const confidenceLevel = confidence > 0.8 ? 'clear' : confidence > 0.6 ? 'moderate' : 'subtle';
  const landmarkCount = landmarks.length;
  
  return `Patient is making a ${confidenceLevel} ${baseDescription}. Hand landmark data shows ${landmarkCount} detected points with ${Math.round(confidence * 100)}% detection confidence.`;
}

// Generate medical prompt for Nova Micro
function createMedicalPrompt(gestureDescription: string, medicalContext?: string): string {
  const contextualInfo = medicalContext ? `\n\nMedical Context: ${medicalContext} setting` : '';
  
  return `You are a medical sign language interpreter in a hospital emergency room. A deaf patient is communicating through gestures.

Gesture Description: ${gestureDescription}${contextualInfo}

As a medical professional, provide your interpretation in this EXACT JSON format:
{
  "medicalMeaning": "primary medical interpretation",
  "urgencyLevel": [number 1-10, where 10 is life-threatening emergency],
  "priority": "critical|high|medium|low",
  "recommendedActions": ["action1", "action2", "action3"],
  "translationText": "clear English translation for medical staff",
  "confidence": [number 0.0-1.0 representing interpretation confidence]
}

Focus on:
1. Medical accuracy and patient safety
2. Appropriate urgency level for healthcare setting
3. Specific actionable recommendations for medical staff
4. Clear communication for emergency scenarios

Respond ONLY with the JSON object, no additional text.`;
}

// Parse Nova Micro response and ensure proper format
function parseNovaResponse(response: string, originalGesture: string): NovaSignLanguageResponse {
  try {
    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      gesture: originalGesture,
      confidence: parsed.confidence || 0.7,
      medicalPriority: parsed.priority || 'medium',
      urgencyScore: parsed.urgencyLevel || 5,
      description: parsed.medicalMeaning || 'Medical gesture interpretation',
      recommendedActions: parsed.recommendedActions || ['Assess patient condition'],
      translationText: parsed.translationText || 'Patient communication detected',
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Failed to parse Nova response:', error);
    
    // Fallback interpretation based on original gesture
    return createFallbackResponse(originalGesture, response);
  }
}

// Create fallback response if Nova Micro fails or response is unparseable
function createFallbackResponse(gesture: string, novaResponse: string): NovaSignLanguageResponse {
  const fallbackMap: { [key: string]: Partial<NovaSignLanguageResponse> } = {
    'emergency': {
      medicalPriority: 'critical',
      urgencyScore: 10,
      description: 'Emergency assistance needed',
      recommendedActions: ['Alert medical staff immediately', 'Prepare for emergency response']
    },
    'help': {
      medicalPriority: 'critical', 
      urgencyScore: 9,
      description: 'Request for medical assistance',
      recommendedActions: ['Respond immediately to patient request', 'Assess patient condition']
    },
    'pain': {
      medicalPriority: 'high',
      urgencyScore: 7,
      description: 'Patient indicating pain or discomfort',
      recommendedActions: ['Assess pain level and location', 'Consider pain management']
    }
  };
  
  const fallback = fallbackMap[gesture] || {
    medicalPriority: 'medium',
    urgencyScore: 5,
    description: 'General medical communication',
    recommendedActions: ['Assess patient needs']
  };
  
  return {
    gesture,
    confidence: 0.6, // Lower confidence for fallback
    medicalPriority: fallback.medicalPriority as any,
    urgencyScore: fallback.urgencyScore!,
    description: fallback.description!,
    recommendedActions: fallback.recommendedActions!,
    translationText: `Patient communication: ${fallback.description}`,
    timestamp: Date.now()
  };
}

// Invoke Nova Micro model
async function invokeNovaModel(prompt: string): Promise<string> {
  const payload = {
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }]
      }
    ],
    inferenceConfig: {
      maxTokens: 800,
      temperature: 0.1, // Low temperature for medical accuracy
      topP: 0.9
    }
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    body: JSON.stringify(payload),
    contentType: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.output.message.content[0].text;
}

// Main handler function
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Nova Micro Sign Language Processor - Processing request');

  try {
    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    // Validate request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['gesture', 'landmarks', 'confidence']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { gesture, landmarks, confidence, medicalContext, timestamp }: SignLanguageRequest = validation.data;

    console.log(`Processing gesture: ${gesture} with confidence: ${confidence}`);

    // Create descriptive text for Nova Micro
    const gestureDescription = createGestureDescription(gesture, landmarks, confidence);
    const medicalPrompt = createMedicalPrompt(gestureDescription, medicalContext);

    console.log('Calling Nova Micro for medical interpretation...');

    // Get interpretation from Nova Micro
    const novaResponse = await invokeNovaModel(medicalPrompt);
    
    console.log('Nova Micro response received, parsing...');

    // Parse and structure the response
    const result = parseNovaResponse(novaResponse, gesture);

    console.log(`Processed gesture: ${result.gesture}, Priority: ${result.medicalPriority}, Urgency: ${result.urgencyScore}`);

    return createResponse(200, {
      success: true,
      result: result,
      source: 'nova-micro',
      processingTime: Date.now() - (timestamp || Date.now())
    });

  } catch (error) {
    console.error('Error in Nova Micro sign language processing:', error);
    
    return createErrorResponse(500, 'Sign language processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'nova-micro-handler'
    });
  }
};

// Export for backward compatibility
export const novaSignLanguageProcessor = handler;
