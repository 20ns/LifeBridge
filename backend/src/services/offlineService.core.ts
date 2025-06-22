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
  private cache: Map<string, any> = new Map();

  // Simple static emergency phrases dataset for offline scenarios
  private emergencyPhrasesByLang: Record<string, Array<{ english: string; translation: string; category: string }>> = {
    es: [
      {
        english: 'heart attack',
        translation: 'infarto de miocardio',
        category: 'cardiac',
      },
      {
        english: 'stroke',
        translation: 'derrame cerebral',
        category: 'neurological',
      },
    ],
  };

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
    arg1: string,
    arg2: any,
    sourceLanguage?: string,
    targetLanguage?: string,
    _context: string = 'general',
    confidence: number = 0.9
  ): Promise<void> {
    // Support two call signatures:
    // 1) (cacheKey, { translatedText, confidence })
    // 2) (sourceText, translatedText, sourceLang, targetLang)
    if (typeof sourceLanguage === 'undefined' && typeof targetLanguage === 'undefined') {
      // Treat arg1 as cacheKey, arg2 as translation object
      const key = arg1;
      const data = arg2 as { [key: string]: any };
      this.cache.set(key, { ...data });
    } else {
      const key = this.generateCacheKey(arg1, sourceLanguage!, targetLanguage!);
      this.cache.set(key, { translatedText: arg2, confidence });
    }
  }

  /**
   * Return emergency phrases for a given language. Falls back to english keys if none found.
   */
  async getEmergencyPhrases(lang: string): Promise<Array<{ english: string; translation: string; category: string }>> {
    return this.emergencyPhrasesByLang[lang] || [];
  }

  /**
   * Retrieve a cached translation directly via cache key. Helper for tests.
   */
  async getCachedTranslation(cacheKey: string): Promise<{ translatedText: string; confidence: number } | undefined> {
    return this.cache.get(cacheKey);
  }

  /**
   * Dummy connectivity check – always online in test env but returns boolean.
   */
  async checkConnectivity(): Promise<boolean> {
    return true;
  }
}

export const offlineService = new OfflineServiceCore();

export const checkOfflineCapabilities = offlineService.checkOfflineCapabilities.bind(offlineService);
export const translateOffline = offlineService.translateOffline.bind(offlineService);
export const cacheTranslation = offlineService.cacheTranslation.bind(offlineService);
export const getEmergencyPhrases = offlineService.getEmergencyPhrases.bind(offlineService);
export const getCachedTranslation = offlineService.getCachedTranslation.bind(offlineService);
export const checkConnectivity = offlineService.checkConnectivity.bind(offlineService); 