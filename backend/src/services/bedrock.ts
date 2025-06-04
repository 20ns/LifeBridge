import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'eu-north-1' });

// Using Amazon Nova Micro for cost-effective translation in Stockholm region
const MODEL_ID = 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0';

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedLanguage?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> => {
  try {
    const prompt = `You are a professional medical translator. Please translate the following medical text from ${sourceLanguage} to ${targetLanguage}. 

Important guidelines:
- Provide only the translation without any explanation or additional text
- Maintain medical terminology accuracy
- Preserve the original meaning and context

Text to translate: "${text}"

Translation:`;

    const request = {
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    };

    const command = new InvokeModelCommand(request);
    const response = await client.send(command);
    
    if (!response.body) {
      throw new Error('No response body received from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    let translatedText = '';
    if (responseBody.output && responseBody.output.message && responseBody.output.message.content && responseBody.output.message.content[0]) {
      translatedText = responseBody.output.message.content[0].text.trim();
    } else {
      throw new Error('Unexpected response format from Nova Micro model');
    }

    if (translatedText.toLowerCase().startsWith('translation:')) {
      translatedText = translatedText.substring(12).trim();
    }

    return {
      translatedText,
      confidence: 0.9,
      detectedLanguage: sourceLanguage,
      sourceLanguage,
      targetLanguage
    };

  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const prompt = `Detect the language of the following text and respond with only the two-letter ISO language code (e.g., 'en' for English, 'es' for Spanish).

Text: "${text}"

Language code:`;

    const request = {
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    };

    const command = new InvokeModelCommand(request);
    const response = await client.send(command);
    
    if (!response.body) {
      return 'en';
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    let detectedLanguage = '';
    if (responseBody.output && responseBody.output.message && responseBody.output.message.content && responseBody.output.message.content[0]) {
      detectedLanguage = responseBody.output.message.content[0].text.trim().toLowerCase();
    }

    const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ar', 'ru', 'pt', 'hi', 'ja'];
    if (validLanguages.includes(detectedLanguage)) {
      return detectedLanguage;
    }

    return 'en';

  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
};
