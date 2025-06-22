import { translateText as bedrockTranslate } from './bedrock';

export interface OfflineCapabilities {
  hasCachedTranslation: boolean;
  hasEmergencyPhrases: boolean;
  canHandleOffline: boolean;
  estimatedAccuracy: number;
  fallbackOptions: string[];
}

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  method: string;
  fallbackUsed: boolean;
  emergencyAlert?: string;
  detectedLanguage?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  reasoning?: string;
}

class OfflineServiceCore {
  private cache: Map<string, { translatedText: string; confidence: number }> = new Map();

  private generateCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}:${targetLanguage}:${text}`.toLowerCase();
  }

  async checkOfflineCapabilities(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    _context: string = 'general'
  ): Promise<OfflineCapabilities> {
    const key = this.generateCacheKey(text, sourceLanguage, targetLanguage);
    const hasCached = this.cache.has(key);
    return {
      hasCachedTranslation: hasCached,
      hasEmergencyPhrases: false,
      canHandleOffline: hasCached,
      estimatedAccuracy: hasCached ? 0.95 : 0.85,
      fallbackOptions: hasCached ? ['cached'] : [],
    };
  }

  async translateOffline(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'general'
  ): Promise<TranslationResult> {
    const key = this.generateCacheKey(text, sourceLanguage, targetLanguage);

    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      return {
        translatedText: entry.translatedText,
        confidence: entry.confidence,
        method: 'cache',
        fallbackUsed: false,
      };
    }

    // Fallback to online model even when called from "offline" path (backend always online)
    const online = await bedrockTranslate(text, sourceLanguage, targetLanguage, context as any);
    this.cache.set(key, { translatedText: online.translatedText, confidence: online.confidence });

    return {
      ...online,
      method: 'bedrock',
      fallbackUsed: false,
    };
  }

  async cacheTranslation(
    sourceText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    _context: string = 'general',
    confidence: number = 0.9
  ): Promise<void> {
    const key = this.generateCacheKey(sourceText, sourceLanguage, targetLanguage);
    this.cache.set(key, { translatedText, confidence });
  }
}

export const offlineService = new OfflineServiceCore();

export const checkOfflineCapabilities = offlineService.checkOfflineCapabilities.bind(offlineService);
export const translateOffline = offlineService.translateOffline.bind(offlineService);
export const cacheTranslation = offlineService.cacheTranslation.bind(offlineService); 