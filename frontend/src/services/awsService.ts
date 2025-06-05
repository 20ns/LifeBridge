// Backend API Configuration
// Use deployed AWS API Gateway URL
const API_BASE_URL = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev';

// Utility function to convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

// Utility function to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

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

export interface EmergencyProtocol {
  id: string;
  category: 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'pediatric' | 'obstetric';
  severity: 'critical' | 'urgent' | 'moderate';
  title: string;
  immediateActions: string[];
  timeframe: string;
  equipment: string[];
  contraindications: string[];
  followup: string[];
}

export interface TriageSuggestion {
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  reasoning: string;
  timeframe: string;
  immediateActions: string[];
  referrals: string[];
  monitoring: string[];
  followupRequired: boolean;
}

export interface ContextualAdvice {
  culturalConsiderations: string[];
  criticalTerminology: string[];
  potentialMisunderstandings: string[];
  verificationSteps: string[];
  safetyConsiderations: string[];
}

export interface EmergencyProtocol {
  id: string;
  category: 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'pediatric' | 'obstetric';
  severity: 'critical' | 'urgent' | 'moderate';
  title: string;
  immediateActions: string[];
  timeframe: string;
  equipment: string[];
  contraindications: string[];
  followup: string[];
}

export interface TriageSuggestion {
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  reasoning: string;
  timeframe: string;
  immediateActions: string[];
  referrals: string[];
  monitoring: string[];
  followupRequired: boolean;
}

export interface ContextualAdvice {
  culturalConsiderations: string[];
  criticalTerminology: string[];
  potentialMisunderstandings: string[];
  verificationSteps: string[];
  safetyConsiderations: string[];
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

// Enhanced speech recognition using AWS Transcribe with medical context
export const transcribeAudio = async (
  audioBlob: Blob, 
  language: string, 
  medicalContext?: string
): Promise<{ transcript: string; confidence: number }> => {
  try {
    // Convert blob to base64
    const audioData = await blobToBase64(audioBlob);
    
    // Start transcription job with medical context
    const response = await fetch(`${API_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: audioData.split(',')[1], // Remove data URL prefix
        language,
        medicalContext
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start transcription');
    }

    const startData = await response.json();
    const jobId = startData.data?.jobId || startData.jobId;

    // Poll for completion with enhanced results
    return await pollTranscriptionResult(jobId);
    
  } catch (error) {
    console.error('Speech transcription error:', error);
    throw new Error(`Speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced poll transcription job status with medical context
const pollTranscriptionResult = async (jobId: string, maxAttempts: number = 30): Promise<{ transcript: string; confidence: number }> => {
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
      
      // Handle the nested response structure
      const resultData = data.data || data;
      
      if (resultData.status === 'COMPLETED') {
        return {
          transcript: resultData.transcript || '',
          confidence: resultData.confidence || 0.8
        };
      }
      
      if (resultData.status === 'FAILED') {
        throw new Error('Transcription job failed');
      }      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }
  
  throw new Error('Transcription job timed out');
};

// Amazon Q Emergency Protocol Functions
export const getEmergencyProtocol = async (
  symptoms: string,
  patientAge?: number,
  medicalHistory?: string[],
  severity?: 'critical' | 'urgent' | 'moderate'
): Promise<{ recommendations: EmergencyProtocol; source: string; confidence: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/emergency-protocol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symptoms,
        patientAge,
        medicalHistory,
        severity
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get emergency protocol');
    }

    return await response.json();
  } catch (error) {
    console.error('Emergency protocol error:', error);
    throw error;
  }
};

export const getTriageSuggestion = async (
  chiefComplaint: string,
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  },
  painScale?: number
): Promise<{ triage: TriageSuggestion; source: string; confidence: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/triage-suggestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chiefComplaint,
        vitalSigns,
        painScale
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get triage suggestion');
    }

    return await response.json();
  } catch (error) {
    console.error('Triage suggestion error:', error);
    throw error;
  }
};

export const getContextualAdvice = async (
  medicalText: string,
  sourceLanguage: string,
  targetLanguage: string,
  context: 'emergency' | 'consultation' | 'medication' | 'general'
): Promise<{ advice: ContextualAdvice; source: string; confidence: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/contextual-advice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        medicalText,
        sourceLanguage,
        targetLanguage,
        context
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get contextual advice');
    }

    return await response.json();
  } catch (error) {
    console.error('Contextual advice error:', error);
    throw error;
  }
};
