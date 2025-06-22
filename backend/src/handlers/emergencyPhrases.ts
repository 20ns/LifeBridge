import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { translateText } from '../services/bedrock';
import { createResponse, createErrorResponse } from '../utils/response';

// Emergency phrases data
const emergencyPhrases = [
  {
    id: 1,
    category: 'Emergency',
    english: 'Call an ambulance immediately!',
    severity: 'critical'
  },
  {
    id: 2,
    category: 'Pain Assessment',
    english: 'Where does it hurt?',
    severity: 'high'
  },
  {
    id: 3,
    category: 'Pain Assessment',
    english: 'Rate your pain from 1 to 10',
    severity: 'medium'
  },
  {
    id: 4,
    category: 'Medical History',
    english: 'Do you have any allergies?',
    severity: 'high'
  },
  {
    id: 5,
    category: 'Medical History',
    english: 'Are you taking any medications?',
    severity: 'high'
  },
  {
    id: 6,
    category: 'Symptoms',
    english: 'When did the symptoms start?',
    severity: 'medium'
  },
  {
    id: 7,
    category: 'Emergency',
    english: 'Are you having trouble breathing?',
    severity: 'critical'
  },
  {
    id: 8,
    category: 'Vital Signs',
    english: 'I need to check your blood pressure',
    severity: 'medium'
  },
  {
    id: 9,
    category: 'Communication',
    english: 'Please stay calm, we are here to help',
    severity: 'low'
  },
  {
    id: 10,
    category: 'Emergency',
    english: 'Do you have chest pain?',
    severity: 'critical'
  }
];

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Emergency phrases request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    // Validate request method
    if (event.httpMethod !== 'GET') {
      return createErrorResponse(405, 'Method not allowed');
    }

    // Get query parameters
    const targetLanguage = event.queryStringParameters?.language || 'es';
    const translate = event.queryStringParameters?.translate === 'true';

    let phrasesData = emergencyPhrases;

    // If translation is requested, translate all phrases
    if (translate && targetLanguage !== 'en') {
      console.log(`Translating emergency phrases to ${targetLanguage}`);
      
      const translationPromises = emergencyPhrases.map(async (phrase) => {
        try {
          const result = await translateText(phrase.english, 'en', targetLanguage);
          return {
            ...phrase,
            translated: result.translatedText,
            confidence: result.confidence
          };
        } catch (error) {
          console.error(`Failed to translate phrase ${phrase.id}:`, error);
          return {
            ...phrase,
            translated: phrase.english, // Fallback to English
            confidence: 0
          };
        }
      });

      phrasesData = await Promise.all(translationPromises);
    }

    console.log(`Returning ${phrasesData.length} emergency phrases`);
    return createResponse(200, {
      phrases: phrasesData,
      targetLanguage,
      translated: translate,
      totalCount: phrasesData.length
    }, 'Emergency phrases retrieved successfully');

  } catch (error) {
    console.error('Emergency phrases handler error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Failed to retrieve emergency phrases', errorMessage);
  }
};
