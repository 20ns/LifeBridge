import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { detectLanguage } from '../services/bedrock';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Language detection request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    // Validate request method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    // Validate request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['text']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { text } = validation.data;

    // Validate input
    if (!text.trim()) {
      return createErrorResponse(400, 'Text cannot be empty');
    }

    if (text.length > 1000) {
      return createErrorResponse(400, 'Text too long for language detection (maximum 1000 characters)');
    }

    // Perform language detection
    console.log(`Detecting language for: "${text}"`);
    const detectedLanguage = await detectLanguage(text);

    console.log('Language detection successful:', detectedLanguage);
    return createResponse(200, { 
      detectedLanguage,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '') // Return partial text for confirmation
    }, 'Language detection completed successfully');

  } catch (error) {
    console.error('Language detection handler error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Language detection failed', errorMessage);
  }
};
