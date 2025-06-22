import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { translateText } from '../services/bedrock';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION, BEDROCK_MODEL_ID } from '../config';

// Advanced AI-powered medical translation validation
export const validateMedicalTranslation = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Medical translation validation request:', JSON.stringify(event, null, 2));

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

    const validation = validateRequestBody(event.body, ['originalText', 'translatedText', 'sourceLanguage', 'targetLanguage']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { originalText, translatedText, sourceLanguage, targetLanguage, medicalContext } = validation.data;

    // Use Bedrock AI to validate medical translation accuracy
    const result = await validateTranslationWithAI(originalText, translatedText, sourceLanguage, targetLanguage, medicalContext);

    return createResponse(200, result, 'Medical translation validation completed');

  } catch (error) {
    console.error('Medical validation error:', error);
    return createErrorResponse(500, 'Medical validation failed', error instanceof Error ? error.message : 'Unknown error');
  }
};

// AI-powered cultural adaptation for medical communication
export const adaptMedicalCommunication = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Medical cultural adaptation request:', JSON.stringify(event, null, 2));

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

    const validation = validateRequestBody(event.body, ['medicalText', 'targetCulture', 'communicationContext']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { medicalText, targetCulture, communicationContext, patientAge, urgency } = validation.data;

    // Use Bedrock AI for cultural adaptation
    const result = await adaptCommunicationWithAI(medicalText, targetCulture, communicationContext, { patientAge, urgency });

    return createResponse(200, result, 'Medical communication adaptation completed');

  } catch (error) {
    console.error('Cultural adaptation error:', error);
    return createErrorResponse(500, 'Cultural adaptation failed', error instanceof Error ? error.message : 'Unknown error');
  }
};

// AI-powered emergency phrase safety validation
export const validateEmergencyPhrase = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Emergency phrase validation request:', JSON.stringify(event, null, 2));

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

    const validation = validateRequestBody(event.body, ['phrase', 'targetLanguage', 'severity']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { phrase, targetLanguage, severity, medicalContext } = validation.data;

    // Use Bedrock AI to validate emergency phrase safety
    const result = await validateEmergencyPhraseWithAI(phrase, targetLanguage, severity, medicalContext);

    return createResponse(200, result, 'Emergency phrase validation completed');

  } catch (error) {
    console.error('Emergency validation error:', error);
    return createErrorResponse(500, 'Emergency validation failed', error instanceof Error ? error.message : 'Unknown error');
  }
};

// Helper functions that leverage Bedrock's AI capabilities

const validateTranslationWithAI = async (
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
  medicalContext?: string
): Promise<{
  isAccurate: boolean;
  confidence: number;
  safetyWarnings: string[];
  alternatives: string[];
  reasoning: string;
}> => {
  // This is where Bedrock AI shines - complex reasoning about medical accuracy
  const client = new BedrockRuntimeClient({ region: AWS_REGION });
  const MODEL_ID = BEDROCK_MODEL_ID;

  const prompt = `You are a medical translation safety expert. Analyze this translation for accuracy and potential medical risks.

Original (${sourceLanguage}): "${originalText}"
Translation (${targetLanguage}): "${translatedText}"
Medical Context: ${medicalContext || 'general'}

Evaluate:
1. Medical terminology accuracy
2. Potential for misunderstanding
3. Safety implications
4. Cultural appropriateness

Provide your analysis as JSON:
{
  "isAccurate": boolean,
  "confidence": number (0-1),
  "safetyWarnings": ["warning1", "warning2"],
  "alternatives": ["alt1", "alt2"],
  "reasoning": "explanation"
}`;

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }]
    })
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  try {
    const aiResponse = responseBody.output.message.content[0].text;
    return JSON.parse(aiResponse);
  } catch {
    return {
      isAccurate: true,
      confidence: 0.5,
      safetyWarnings: [],
      alternatives: [],
      reasoning: 'AI analysis unavailable, manual review recommended'
    };
  }
};

const adaptCommunicationWithAI = async (
  medicalText: string,
  targetCulture: string,
  communicationContext: string,
  options: { patientAge?: number; urgency?: string }
): Promise<{
  adaptedText: string;
  culturalConsiderations: string[];
  communicationTips: string[];
  reasoning: string;
}> => {
  const client = new BedrockRuntimeClient({ region: AWS_REGION });
  const MODEL_ID = BEDROCK_MODEL_ID;

  const prompt = `You are a cross-cultural medical communication expert. Adapt this medical communication for the target culture.

Medical Text: "${medicalText}"
Target Culture: ${targetCulture}
Context: ${communicationContext}
Patient Age: ${options.patientAge || 'unknown'}
Urgency: ${options.urgency || 'routine'}

Consider:
1. Cultural attitudes toward medical care
2. Communication styles (direct vs indirect)
3. Family involvement expectations
4. Religious/cultural considerations
5. Age-appropriate communication

Provide adaptation as JSON:
{
  "adaptedText": "culturally adapted version",
  "culturalConsiderations": ["consideration1", "consideration2"],
  "communicationTips": ["tip1", "tip2"],
  "reasoning": "explanation of adaptations made"
}`;

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }]
    })
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  try {
    const aiResponse = responseBody.output.message.content[0].text;
    return JSON.parse(aiResponse);
  } catch {
    return {
      adaptedText: medicalText,
      culturalConsiderations: ['Manual cultural review recommended'],
      communicationTips: ['Use professional, respectful tone'],
      reasoning: 'AI adaptation unavailable'
    };
  }
};

const validateEmergencyPhraseWithAI = async (
  phrase: string,
  targetLanguage: string,
  severity: string,
  medicalContext?: string
): Promise<{
  isEmergencySafe: boolean;
  urgencyLevel: number;
  potentialMisunderstandings: string[];
  alternativePhrasings: string[];
  culturalWarnings: string[];
}> => {
  const client = new BedrockRuntimeClient({ region: AWS_REGION });
  const MODEL_ID = BEDROCK_MODEL_ID;

  const prompt = `You are an emergency medical communication expert. Analyze this emergency phrase for safety and effectiveness.

Emergency Phrase: "${phrase}"
Target Language: ${targetLanguage}
Severity: ${severity}
Medical Context: ${medicalContext || 'general emergency'}

Evaluate:
1. Does this phrase convey appropriate urgency?
2. Could it be misunderstood in emergency situations?
3. Are there cultural considerations for this language?
4. What are better alternatives?

Provide analysis as JSON:
{
  "isEmergencySafe": boolean,
  "urgencyLevel": number (1-10),
  "potentialMisunderstandings": ["issue1", "issue2"],
  "alternativePhrasings": ["alt1", "alt2"],
  "culturalWarnings": ["warning1", "warning2"]
}`;

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }]
    })
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  try {
    const aiResponse = responseBody.output.message.content[0].text;
    return JSON.parse(aiResponse);
  } catch {
    return {
      isEmergencySafe: true,
      urgencyLevel: 5,
      potentialMisunderstandings: [],
      alternativePhrasings: [],
      culturalWarnings: ['Manual review recommended for emergency use']
    };
  }
};
