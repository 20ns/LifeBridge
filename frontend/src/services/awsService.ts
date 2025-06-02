import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// AWS Configuration
const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
  },
});

// Language mappings for better translation context
const languageNames: { [key: string]: string } = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'ru': 'Russian',
  'pt': 'Portuguese',
  'hi': 'Hindi',
  'ja': 'Japanese'
};

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedLanguage?: string;
}

export const translateText = async (
  text: string, 
  sourceLanguage: string, 
  targetLanguage: string
): Promise<TranslationResult> => {
  try {
    // Create medical-context aware prompt
    const prompt = `You are a professional medical translator. Please translate the following medical text accurately, preserving all medical terminology and context.

Source Language: ${languageNames[sourceLanguage] || sourceLanguage}
Target Language: ${languageNames[targetLanguage] || targetLanguage}

Medical Text to Translate: "${text}"

Requirements:
1. Maintain medical accuracy and terminology
2. Preserve urgency and tone for emergency situations
3. Use culturally appropriate medical language
4. Ensure clarity for healthcare communication

Please provide only the translation without explanations or additional text.`;

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: body,
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const translatedText = responseBody.content[0].text.trim();
    
    // Calculate confidence based on text complexity and length
    const confidence = calculateConfidence(text, translatedText);
    
    return {
      translatedText,
      confidence,
      detectedLanguage: sourceLanguage
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback to basic translation if AWS fails
    return {
      translatedText: `[Translation Error: ${text}]`,
      confidence: 0,
      detectedLanguage: sourceLanguage
    };
  }
};

export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const prompt = `Detect the language of the following text and respond with only the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish):

Text: "${text}"

Language code:`;

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: body,
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const detectedLanguage = responseBody.content[0].text.trim().toLowerCase();
    
    // Validate the detected language code
    if (languageNames[detectedLanguage]) {
      return detectedLanguage;
    }
    
    return 'en'; // Default to English if detection fails
    
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
};

// Helper function to calculate translation confidence
const calculateConfidence = (source: string, translation: string): number => {
  // Basic confidence calculation based on:
  // 1. Length ratio (translations should be reasonably similar in length)
  // 2. Complexity preservation
  // 3. Medical terminology presence
  
  const lengthRatio = Math.min(source.length, translation.length) / Math.max(source.length, translation.length);
  const baseConfidence = lengthRatio * 0.8;
  
  // Boost confidence for medical terms
  const medicalTerms = ['pain', 'symptom', 'patient', 'doctor', 'nurse', 'hospital', 'emergency', 'medicine', 'treatment'];
  const medicalTermCount = medicalTerms.filter(term => 
    source.toLowerCase().includes(term) || translation.toLowerCase().includes(term)
  ).length;
  
  const medicalBonus = Math.min(medicalTermCount * 0.05, 0.2);
  
  return Math.min(baseConfidence + medicalBonus, 1.0);
};

// Speech synthesis for different languages
export const speakText = async (text: string, language: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.8; // Slightly slower for medical context
    utterance.volume = 0.9;
    
    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);
    
    speechSynthesis.speak(utterance);
  });
};
