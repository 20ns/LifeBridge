// Translation service using Amazon Translate and Amazon Comprehend
// Updated from Bedrock to use native AWS translation services
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';

// AWS Configuration
export const translateClient = new TranslateClient({
  region: 'us-east-1',
});

export const comprehendClient = new ComprehendClient({
  region: 'us-east-1',
});

// Language mappings for better translation context
export const languageNames: { [key: string]: string } = {
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
  sourceLanguage: string;
  targetLanguage: string;
}

export const translateText = async (
  text: string, 
  sourceLanguage: string, 
  targetLanguage: string
): Promise<TranslationResult> => {
  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage
    });

    const response = await translateClient.send(command);
    
    if (!response.TranslatedText) {
      throw new Error('No translation received from Amazon Translate');
    }
    
    // Calculate confidence based on text complexity and length
    const confidence = calculateConfidence(text, response.TranslatedText);
    
    return {
      translatedText: response.TranslatedText,
      confidence,
      detectedLanguage: response.SourceLanguageCode || sourceLanguage,
      sourceLanguage: response.SourceLanguageCode || sourceLanguage,
      targetLanguage: response.TargetLanguageCode || targetLanguage
    };
  } catch (error) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Translation failed: ${errorMessage}`);
  }
};

export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const command = new DetectDominantLanguageCommand({
      Text: text
    });
    
    const response = await comprehendClient.send(command);
    
    if (response.Languages && response.Languages.length > 0) {
      // Return the language with highest confidence score
      const dominantLanguage = response.Languages[0];
      if (dominantLanguage.LanguageCode) {
        return dominantLanguage.LanguageCode;
      }
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
