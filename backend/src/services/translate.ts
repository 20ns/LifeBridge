import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';
import { translateText as bedrockTranslate } from './bedrock';

const translateClient = new TranslateClient({ region: 'eu-north-1' });
const comprehendClient = new ComprehendClient({ region: 'eu-north-1' });

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedLanguage?: string;
  sourceLanguage: string;
  targetLanguage: string;
  method: 'translate' | 'bedrock';
  reasoning: string;
}

// Language code mappings for Amazon Translate
const translateLanguageMap: { [key: string]: string } = {
  'en': 'en',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'pt': 'pt',
  'ar': 'ar',
  'ru': 'ru',
  'zh': 'zh',
  'hi': 'hi',
  'ja': 'ja'
};

// Basic medical terms that work well with Amazon Translate
const basicMedicalTerms = [
  'pain', 'hurt', 'help', 'emergency', 'medicine', 'doctor', 'nurse',
  'temperature', 'fever', 'cough', 'headache', 'nausea', 'dizzy'
];

// Complex medical scenarios that need Bedrock AI
const complexMedicalPatterns = [
  /dosage|medication schedule|drug interaction/i,
  /cultural.*medical|religious.*treatment|cultural.*pain/i,
  /emergency.*protocol|critical.*decision|life.*threatening/i,
  /psychiatric|mental health|psychological/i,
  /pediatric.*dose|child.*medication|infant/i,
  /contraindication|allergy.*reaction|adverse.*effect/i
];

// Determine if text needs AI reasoning (Bedrock) or simple translation (Amazon Translate)
const needsAIReasoning = (text: string, context?: string): boolean => {
  // Emergency contexts always use Bedrock for safety validation
  if (context === 'emergency') {
    return true;
  }

  // Complex medical scenarios need AI
  if (complexMedicalPatterns.some(pattern => pattern.test(text))) {
    return true;
  }

  // Medication context needs AI for safety
  if (context === 'medication') {
    return true;
  }

  // Long texts with medical complexity need AI
  if (text.length > 100 && text.includes('medical')) {
    return true;
  }

  // Simple medical terms can use Amazon Translate
  return false;
};

// Fast translation using Amazon Translate for simple medical terms
export const translateWithAmazonTranslate = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> => {
  try {
    const sourceCode = translateLanguageMap[sourceLanguage] || sourceLanguage;
    const targetCode = translateLanguageMap[targetLanguage] || targetLanguage;

    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceCode,
      TargetLanguageCode: targetCode,
      Settings: {
        Profanity: 'MASK' // Important for medical context
      }
    });

    console.log(`Amazon Translate: "${text}" from ${sourceCode} to ${targetCode}`);
    const response = await translateClient.send(command);

    return {
      translatedText: response.TranslatedText || text,
      confidence: 0.95, // Amazon Translate is highly reliable for basic translations
      detectedLanguage: sourceLanguage,
      sourceLanguage,
      targetLanguage,      method: 'translate',
      reasoning: 'Simple medical terms - optimized for speed and cost'
    };

  } catch (error) {
    console.error('Amazon Translate error:', error);
    throw new Error(`Amazon Translate failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// AI-powered translation using Bedrock for complex medical scenarios
export const translateWithBedrock = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: 'emergency' | 'consultation' | 'medication' | 'general'
): Promise<TranslationResult> => {
  // Import Bedrock service here to avoid circular dependencies
  const { translateText: bedrockTranslate } = await import('./bedrock');
  
  try {
    const result = await bedrockTranslate(text, sourceLanguage, targetLanguage, context);
    
    return {
      ...result,      method: 'bedrock',
      reasoning: `AI reasoning required for ${context || 'complex'} medical context`
    };
  } catch (error) {
    console.error('Bedrock translation error:', error);
    throw error;
  }
};

// Hybrid translation service - uses the right tool for the job
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: 'emergency' | 'consultation' | 'medication' | 'general'
): Promise<TranslationResult> => {
  try {
    // Same language check
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        confidence: 1.0,
        detectedLanguage: sourceLanguage,
        sourceLanguage,
        targetLanguage,        method: 'translate',
        reasoning: 'Same language - no translation needed'
      };
    }

    // Decide which service to use based on complexity
    const useAI = needsAIReasoning(text, context);
    
    if (useAI) {
      console.log('🧠 Using Bedrock AI for complex medical translation');
      return await translateWithBedrock(text, sourceLanguage, targetLanguage, context);
    } else {
      console.log('⚡ Using Amazon Translate for fast basic translation');
      return await translateWithAmazonTranslate(text, sourceLanguage, targetLanguage);
    }

  } catch (error) {
    console.error('Translation service error:', error);
    
    // Fallback: try the other service if one fails
    try {
      const useAI = needsAIReasoning(text, context);
      console.log(`🔄 Falling back to ${useAI ? 'Amazon Translate' : 'Bedrock AI'}`);
      
      if (useAI) {
        return await translateWithAmazonTranslate(text, sourceLanguage, targetLanguage);
      } else {
        return await translateWithBedrock(text, sourceLanguage, targetLanguage, context);
      }
    } catch (fallbackError) {
      console.error('Fallback translation failed:', fallbackError);
      
      // Final fallback - return original text
      return {
        translatedText: text,
        confidence: 0,
        detectedLanguage: sourceLanguage,
        sourceLanguage,
        targetLanguage,        method: 'translate',
        reasoning: 'Translation failed - returned original text'
      };
    }
  }
};

// Language detection using Amazon Comprehend
export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const command = new DetectDominantLanguageCommand({
      Text: text
    });

    const response = await comprehendClient.send(command);
    
    if (response.Languages && response.Languages.length > 0) {
      const topLanguage = response.Languages[0];
      const languageCode = topLanguage.LanguageCode || 'en';
      
      console.log(`Detected language: ${languageCode} (confidence: ${topLanguage.Score})`);
      return languageCode;
    }

    return 'en'; // Default to English
    
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
};
