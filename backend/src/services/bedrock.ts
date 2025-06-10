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

// Emergency fallback phrases for critical situations
const EMERGENCY_FALLBACKS: Record<string, Record<string, string>> = {
  'Call for help': {
    es: '¡Llama a ayuda!',
    fr: 'Appelez à l\'aide!',
    de: 'Rufen Sie um Hilfe!',
    zh: '呼救！',
    ar: 'اطلب المساعدة!',
    ru: 'Зовите на помощь!',
    pt: 'Peça ajuda!',
    hi: 'मदद के लिए बुलाओ!',
    ja: '助けを呼んでください！'
  },
  'Emergency': {
    es: 'Emergencia',
    fr: 'Urgence',
    de: 'Notfall',
    zh: '紧急情况',
    ar: 'طوارئ',
    ru: 'Экстренная ситуация',
    pt: 'Emergência',
    hi: 'आपातकाल',
    ja: '緊急事態'
  },
  'Pain': {
    es: 'Dolor',
    fr: 'Douleur',
    de: 'Schmerz',
    zh: '疼痛',
    ar: 'ألم',
    ru: 'Боль',
    pt: 'Dor',
    hi: 'दर्द',
    ja: '痛み'
  },
  'Help': {
    es: 'Ayuda',
    fr: 'Aide',
    de: 'Hilfe',
    zh: '帮助',
    ar: 'مساعدة',
    ru: 'Помощь',
    pt: 'Ajuda',
    hi: 'सहायता',
    ja: '助け'
  }
};

// Fallback translation for critical emergency phrases
const getFallbackTranslation = (text: string, targetLanguage: string): string | null => {
  // Check for exact matches first
  if (EMERGENCY_FALLBACKS[text] && EMERGENCY_FALLBACKS[text][targetLanguage]) {
    return EMERGENCY_FALLBACKS[text][targetLanguage];
  }
  
  // Check for partial matches (case insensitive)
  const lowerText = text.toLowerCase();
  for (const [key, translations] of Object.entries(EMERGENCY_FALLBACKS)) {
    if (lowerText.includes(key.toLowerCase()) && translations[targetLanguage]) {
      return translations[targetLanguage];
    }
  }
  
  return null;
};

export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: 'emergency' | 'consultation' | 'medication' | 'general'
): Promise<TranslationResult> => {
  try {
    // Enhanced medical context prompts
    const contextPrompts = {
      emergency: `You are a critical care medical translator. This is an EMERGENCY translation. Translate with maximum accuracy and urgency. Medical errors could be life-threatening.`,
      consultation: `You are a clinical medical translator. This is for patient consultation. Ensure precise medical terminology and maintain professional tone.`,
      medication: `You are a pharmaceutical translator. This involves medication instructions. Be extremely precise with dosages, timing, and medical terms.`,
      general: `You are a professional medical translator. Ensure medical accuracy and clarity.`
    };

    const selectedContext = context || 'general';
    const contextPrompt = contextPrompts[selectedContext];

    const prompt = `${contextPrompt}

Translate the following medical text from ${sourceLanguage} to ${targetLanguage}.

Critical requirements:
- Provide ONLY the translation without explanation
- Maintain exact medical terminology
- Preserve urgency indicators (if any)
- Keep cultural sensitivity in mind
- If uncertain about medical terms, prioritize safety

Source text: "${text}"

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

    // Check for emergency fallback translations
    const fallbackTranslation = getFallbackTranslation(text, targetLanguage);
    if (fallbackTranslation) {
      translatedText = fallbackTranslation;
    }    return {
      translatedText,
      confidence: 0.9,
      detectedLanguage: sourceLanguage,
      sourceLanguage,
      targetLanguage
    };

  } catch (error) {
    console.error('Translation error:', error);
    
    // Try fallback translation for emergency phrases
    const fallback = getFallbackTranslation(text, targetLanguage);
    if (fallback) {
      console.log('Using emergency fallback translation');
      return {
        translatedText: fallback,
        confidence: 0.7, // Lower confidence for fallback
        detectedLanguage: sourceLanguage,
        sourceLanguage,
        targetLanguage
      };
    }
    
    // If no fallback available, throw error
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const prompt = `You are a medical language detection expert. Analyze the following text and determine its language.

Consider:
- Medical terminology that might be in Latin/English regardless of the base language
- Emergency phrases that might be urgent
- Cultural context in medical communication

Respond with ONLY the two-letter ISO language code (e.g., 'en', 'es', 'fr', 'de', 'zh', 'ar', 'ru', 'pt', 'hi', 'ja').

Text to analyze: "${text}"

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
