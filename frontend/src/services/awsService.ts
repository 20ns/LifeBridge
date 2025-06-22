
// Backend API Configuration
// Use local backend for development, deployed URL for production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://5wubqhune7.execute-api.eu-north-1.amazonaws.com/dev'
  : 'http://localhost:3001/dev';

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
  targetLanguage: string,
  context?: 'emergency' | 'consultation' | 'medication' | 'general'
): Promise<TranslationResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLanguage,
        targetLanguage,
        context: context || 'general'
      })
    });if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Translation failed: ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    // Extract from the nested data structure returned by the backend
    const translationData = data.data || data;
    console.log('Translation Data:', translationData);
    
    return {
      translatedText: translationData.translatedText,
      confidence: translationData.confidence || 0.8,
      detectedLanguage: translationData.sourceLanguage || sourceLanguage
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback to basic translation if backend fails
    return {
      translatedText: `[Translation Error: ${text}]`,
      confidence: 0,
      detectedLanguage: sourceLanguage
    };
  }
};

export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/detect-language`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Language detection failed: ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const detectedLanguage = data.detectedLanguage || 'en';
    
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

// Speech synthesis using backend text-to-speech service
export const speakText = async (text: string, language: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text, 
        language,
        outputFormat: 'mp3'
      })
    });

    if (!response.ok) {
      throw new Error('Backend TTS failed, falling back to browser speech');
    }

    const data = await response.json();
    
    if (data.audioUrl) {
      // Play audio from AWS Polly
      const audio = new Audio(data.audioUrl);
      return new Promise((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.play().catch(reject);
      });
    } else {
      throw new Error('No audio URL returned from backend');
    }
    
  } catch (error) {
    console.warn('Backend TTS failed, falling back to browser speech:', error);
    
    // Fallback to browser speech synthesis
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
  }
};

// Get emergency phrases from backend
export const getEmergencyPhrases = async (language?: string): Promise<any[]> => {
  try {
    const url = language 
      ? `${API_BASE_URL}/emergency-phrases?language=${language}`
      : `${API_BASE_URL}/emergency-phrases`;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch emergency phrases');
    }

    const data = await response.json();
    return data.phrases || [];
    
  } catch (error) {
    console.error('Error fetching emergency phrases:', error);
    return [];
  }
};
