import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { translateText } from '../services/translate';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Translation request:', JSON.stringify(event, null, 2));

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

    const validation = validateRequestBody(event.body, ['text', 'sourceLanguage', 'targetLanguage']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { text, sourceLanguage, targetLanguage } = validation.data;

    // Validate input
    if (!text.trim()) {
      return createErrorResponse(400, 'Text cannot be empty');
    }

    if (text.length > 5000) {
      return createErrorResponse(400, 'Text too long (maximum 5000 characters)');
    }

    // Perform translation
    console.log(`Translating: "${text}" from ${sourceLanguage} to ${targetLanguage}`);
    const result = await translateText(text, sourceLanguage, targetLanguage);

    console.log('Translation successful:', result);
    return createResponse(200, result, 'Translation completed successfully');

  } catch (error) {
    console.error('Translation handler error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Translation failed', errorMessage);
  }
};
