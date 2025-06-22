
// Backend API Configuration
// Use local backend for development, deployed URL for production
const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
const API_BASE_URL = isProduction
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
        language
      })
    });

    if (!response.ok) {
      throw new Error('Backend TTS failed, falling back to browser speech');
    }

    const data = await response.json();
    
    if (data.audioBase64) {
      // Create audio from base64 data
      const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl); // Clean up
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl); // Clean up
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });
    } else {
      throw new Error('No audio data returned from backend');
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

// Speech recognition using AWS Transcribe
export const transcribeAudio = async (audioBlob: Blob, language: string): Promise<string> => {
  try {
    // Convert blob to base64
    const audioData = await blobToBase64(audioBlob);
    
    // Start transcription job
    const response = await fetch(`${API_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: audioData.split(',')[1], // Remove data URL prefix
        language
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start transcription');
    }

    const startData = await response.json();
    const jobId = startData.jobId;

    // Poll for completion (in production, consider WebSocket for real-time updates)
    return await pollTranscriptionResult(jobId);
    
  } catch (error) {
    console.error('Speech transcription error:', error);
    throw new Error(`Speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Poll transcription job status
const pollTranscriptionResult = async (jobId: string, maxAttempts: number = 30): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/speech-to-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId })
      });

      if (!response.ok) {
        throw new Error('Failed to check transcription status');
      }

      const data = await response.json();
      
      if (data.status === 'COMPLETED') {
        return data.transcript || '';
      }
      
      if (data.status === 'FAILED') {
        throw new Error('Transcription job failed');
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }
  
  throw new Error('Transcription timeout - job took too long to complete');
};

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper function to convert base64 to blob
const base64ToBlob = (base64: string, contentType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};
