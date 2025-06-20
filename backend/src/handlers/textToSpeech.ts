import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { PollyClient, SynthesizeSpeechCommand, OutputFormat, VoiceId } from '@aws-sdk/client-polly';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';

const pollyClient = new PollyClient({
  region: process.env.REGION || process.env.AWS_REGION || 'eu-north-1',
});

// Voice mappings for different languages
const voiceMap: { [key: string]: VoiceId } = {
  'en': VoiceId.Joanna,
  'es': VoiceId.Conchita,
  'fr': VoiceId.Celine,
  'de': VoiceId.Marlene,
  'pt': VoiceId.Ines,
  'ru': VoiceId.Tatyana,
  'ar': VoiceId.Zeina,
  'hi': VoiceId.Aditi,
  'ja': VoiceId.Mizuki,
  'zh': VoiceId.Zhiyu
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Text-to-speech request:', JSON.stringify(event, null, 2));

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

    const validation = validateRequestBody(event.body, ['text', 'language']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { text, language } = validation.data;

    // Validate input
    if (!text.trim()) {
      return createErrorResponse(400, 'Text cannot be empty');
    }

    if (text.length > 3000) {
      return createErrorResponse(400, 'Text too long for speech synthesis (maximum 3000 characters)');
    }

    // Get appropriate voice for language
    const voiceId = voiceMap[language] || VoiceId.Joanna;

    // Synthesize speech
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voiceId,
      SampleRate: '22050'
    });

    console.log(`Synthesizing speech: "${text}" in ${language} with voice ${voiceId}`);
    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error('No audio stream received from Polly');
    }

    // Convert audio stream to base64
    const audioBytes = await response.AudioStream.transformToByteArray();
    const audioBase64 = Buffer.from(audioBytes).toString('base64');

    console.log('Speech synthesis successful');
    return createResponse(200, {
      audioBase64,
      contentType: 'audio/mpeg',
      language,
      voiceId,
      textLength: text.length
    }, 'Speech synthesis completed successfully');

  } catch (error) {
    console.error('Text-to-speech handler error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Speech synthesis failed', errorMessage);
  }
};
