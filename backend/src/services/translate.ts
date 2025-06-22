import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';
import { translateText as bedrockTranslate } from './bedrock';
import { getCachedTranslation, putCachedTranslation } from './translationCache';

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
  // For predefined emergency phrases, AWS Translate is preferred for direct translation.
  if (context === 'emergency') {
    return false; // Use AWS Translate for emergency phrases
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

// Enhanced context detection based on medical content
const detectMedicalContext = (text: string): 'emergency' | 'consultation' | 'medication' | 'general' => {
  const lowerText = text.toLowerCase();
  
  // Emergency keywords that indicate critical situations
  const emergencyKeywords = [
    'emergency', 'urgent', 'critical', 'severe', 'acute', 'life-threatening',
    'unconscious', 'seizure', 'stroke', 'heart attack', 'cardiac arrest',
    'bleeding', 'hemorrhage', 'breathe', 'breathing', 'chest pain',
    'allergic reaction', 'anaphylaxis', 'overdose', 'poisoning'
  ];
  
  // Medication-related keywords that require pharmaceutical precision
  const medicationKeywords = [
    'dosage', 'dose', 'medication', 'prescription', 'pills', 'tablets',
    'injection', 'insulin', 'mg', 'ml', 'units', 'times daily',
    'before meals', 'after meals', 'side effects', 'drug interaction',
    'allergy', 'contraindication', 'pharmacy', 'refill'
  ];
  
  // Consultation keywords for clinical discussions
  const consultationKeywords = [
    'symptoms', 'diagnosis', 'examination', 'medical history',
    'patient complains', 'presenting with', 'vital signs',
    'blood pressure', 'temperature', 'pulse', 'examination reveals',
    'treatment plan', 'follow-up', 'referral', 'specialist'
  ];
  
  // Check for emergency context first (highest priority)
  if (emergencyKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'emergency';
  }
  
  // Check for medication context (high precision required)
  if (medicationKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'medication';
  }
  
  // Check for consultation context
  if (consultationKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'consultation';
  }
  
  // Default to general medical context
  return 'general';
};

// Hybrid translation service - uses the right tool for the job
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: 'emergency' | 'consultation' | 'medication' | 'general',
  performanceMode: 'standard' | 'optimized' = 'standard'
): Promise<TranslationResult> => {
  try {
    // Intelligent context detection if not provided
    const detectedContext = context || detectMedicalContext(text);
    
    // Log context detection for transparency
    if (!context && detectedContext !== 'general') {
      console.log(`🩺 Auto-detected medical context: ${detectedContext}`);
    }

    // Emergency keywords for priority processing
    const emergencyKeywords = ['emergency', 'urgent', 'pain', 'heart', 'chest', 'breathe', 'breathing', 'help'];
    const isEmergencyText = emergencyKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    // Performance mode optimization
    console.log(`🚀 Performance mode: ${performanceMode}, Emergency: ${isEmergencyText}`);
    
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
    }    // Performance-based service selection
    let useAI = needsAIReasoning(text, detectedContext);
    
    // Optimized mode: Use faster Amazon Translate for emergencies to save time
    if (performanceMode === 'optimized' && isEmergencyText) {
      useAI = false; // Force fast translation for emergencies
      console.log('⚡ Emergency + Optimized mode: Using fast Amazon Translate');
    }
    
    // Standard mode: Be more conservative with AI usage to save costs
    if (performanceMode === 'standard' && !isEmergencyText) {
      // Only use AI for complex medical scenarios in standard mode
      useAI = useAI && (detectedContext === 'medication' || text.length > 200);
      console.log('💰 Standard mode: Conservative AI usage');
    }
    
    let result: TranslationResult;
    if (useAI) {
      console.log('🧠 Using Bedrock AI for complex medical translation');
      result = await translateWithBedrock(text, sourceLanguage, targetLanguage, detectedContext);
    } else {
      console.log('⚡ Using Amazon Translate for fast basic translation');
      result = await translateWithAmazonTranslate(text, sourceLanguage, targetLanguage);
    }

    // Store in cache asynchronously (don't await)
    putCachedTranslation(
      text,
      result.translatedText,
      sourceLanguage,
      targetLanguage,
      result.confidence
    ).catch((err) => console.warn('cache put error', err));

    return result;

  } catch (error) {
    console.error('Translation service error:', error);
    
    // Fallback: try the other service if one fails
    try {
      const useAI = needsAIReasoning(text, context);
      console.log(`🔄 Falling back to ${useAI ? 'Amazon Translate' : 'Bedrock AI'}`);
        if (useAI) {
        return await translateWithAmazonTranslate(text, sourceLanguage, targetLanguage);
      } else {
        return await translateWithBedrock(text, sourceLanguage, targetLanguage, context || 'general');
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
