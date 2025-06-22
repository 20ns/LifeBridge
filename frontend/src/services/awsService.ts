import { API_BASE_URL } from '../config';

// Rate limiting and retry configuration
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds between requests
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 2000; // 2 seconds base delay

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, TranslationResult>();

// Request queue to manage rate limiting
let requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

// Helper function to create a cache key
const createCacheKey = (text: string, sourceLanguage: string, targetLanguage: string, context?: string): string => {
  return `${text}_${sourceLanguage}_${targetLanguage}_${context || 'general'}`;
};

// Helper function to delay execution
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Process request queue with rate limiting
const processQueue = async (): Promise<void> => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
        await delay(RATE_LIMIT_DELAY); // Rate limit between requests
      } catch (error) {
        console.error('Queue request failed:', error);
      }
    }
  }
  
  isProcessingQueue = false;
};

// Add request to queue
const queueRequest = <T>(request: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const queuedRequest = async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    requestQueue.push(queuedRequest);
    processQueue();
  });
};

// Exponential backoff retry logic
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retryCount >= MAX_RETRIES) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')) {
      const backoffDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Rate limited, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(backoffDelay);
      return retryWithBackoff(operation, retryCount + 1);
    }
    
    throw error;
  }
};

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
  medicalAnalysis?: {
    containsMedical: boolean;
    isEmergency: boolean;
    criticalityScore: number;
    recommendedContext: 'emergency' | 'consultation' | 'medication' | 'general';
    modifierContext: 'acute' | 'chronic' | 'neutral';
    detectedTerms: Array<{
      term: string;
      category: string;
      criticality: string;
    }>;
  };
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
  context?: 'emergency' | 'consultation' | 'medication' | 'general',
  performanceMode: 'standard' | 'optimized' = 'standard'
): Promise<TranslationResult> => {  // Check cache first - but skip cache for optimized emergency mode
  const cacheKey = createCacheKey(text, sourceLanguage, targetLanguage, context);
  const isEmergencyOptimized = performanceMode === 'optimized' && context === 'emergency';
  
  if (!isEmergencyOptimized && translationCache.has(cacheKey)) {
    console.log('Using cached translation');
    return translationCache.get(cacheKey)!;
  }

  // If same language, return original text
  if (sourceLanguage === targetLanguage) {
    const result: TranslationResult = {
      translatedText: text,
      confidence: 1.0,
      detectedLanguage: sourceLanguage
    };
    translationCache.set(cacheKey, result);
    return result;
  }

  // Queue the translation request with rate limiting
  return queueRequest(async () => {
    return retryWithBackoff(async () => {
      const response = await fetch(`${API_BASE_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
          context: context || 'general',
          performanceMode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Translation failed: ${errorData.message || errorData.error || 'Unknown error'}`);
      }      const data = await response.json();
      console.log('API Response:', data);
      
      // Extract from the nested data structure returned by the backend
      const translationData = data.data || data;
      console.log('Translation Data:', translationData);
      
      const result: TranslationResult = {
        translatedText: translationData.translatedText,
        confidence: translationData.confidence || 0.8,
        detectedLanguage: translationData.sourceLanguage || sourceLanguage,
        medicalAnalysis: translationData.medicalAnalysis
      };

      // Cache the result
      translationCache.set(cacheKey, result);
      
      return result;
    });
  }).catch((error) => {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return a more user-friendly error message
    const result: TranslationResult = {
      translatedText: text, // Fallback to original text instead of error message
      confidence: 0,
      detectedLanguage: sourceLanguage
    };
    
    return result;
  });
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

// Speech synthesis using browser text-to-speech service
export const speakText = async (
  text: string, 
  language: string, 
  onAudioLevel?: (level: number) => void
): Promise<void> => {
  console.log('Using browser text-to-speech for:', text);
  
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Wait for voices to be loaded (they might not be available immediately)
      const loadVoicesAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.length, voices.map(v => `${v.name} (${v.lang})`));
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice based on language
        if (voices.length > 0) {
          // Try to find a voice for the target language
          let targetVoice = voices.find(voice => 
            voice.lang.toLowerCase() === language.toLowerCase()
          );
          
          // If exact match not found, try partial match
          if (!targetVoice) {
            targetVoice = voices.find(voice => 
              voice.lang.toLowerCase().startsWith(language.toLowerCase().split('-')[0])
            );
          }
          
          // If still no match, try Spanish voices specifically for "es" language
          if (!targetVoice && language.startsWith('es')) {
            targetVoice = voices.find(voice => 
              voice.lang.toLowerCase().includes('es')
            );
          }
          
          if (targetVoice) {
            console.log('Selected voice:', targetVoice.name, targetVoice.lang);
            utterance.voice = targetVoice;
          } else {
            console.log('No specific voice found for language:', language, 'using default');
          }
        } else {
          console.log('No voices available, using default');
        }
        
        // Configure speech parameters for medical use
        utterance.rate = 0.8; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0; // Full volume
        utterance.lang = language;
        
        console.log('Speech settings:', {
          text: utterance.text,
          lang: utterance.lang,
          voice: utterance.voice?.name,
          rate: utterance.rate,
          volume: utterance.volume
        });        let hasResolved = false;
        let audioLevelInterval: NodeJS.Timeout | null = null;

        utterance.onstart = () => {
          console.log('Speech started');
            // Start audio level simulation since we can't easily capture TTS output
          if (onAudioLevel) {
            let animationFrame = 0;
            audioLevelInterval = setInterval(() => {
              // Create more realistic speech pattern animation
              const time = animationFrame * 0.05;
              
              // Base speech envelope (speech has pauses and variations)
              const speechEnvelope = Math.abs(Math.sin(time * 2)) * 0.8 + 0.2;
              
              // Add speech rhythm (syllables and words)
              const syllablePattern = Math.sin(time * 8) * 0.3;
              const wordPattern = Math.sin(time * 1.5) * 0.2;
              
              // Add some randomness for natural variation
              const randomVariation = (Math.random() - 0.5) * 0.3;
              
              // Occasional pauses (simulate between words/sentences)
              const pauseChance = Math.random();
              const isPause = pauseChance < 0.05; // 5% chance of pause each frame
              
              let level;
              if (isPause) {
                level = 0.1; // Very low during pauses
              } else {
                level = speechEnvelope + syllablePattern + wordPattern + randomVariation;
                level = Math.max(0.1, Math.min(0.9, level)); // Keep within bounds
              }
              
              onAudioLevel(level);
              animationFrame++;
            }, 80); // Slightly slower updates for more natural feel
          }
        };
          utterance.onend = () => {
          console.log('Text-to-speech completed via onend');
          if (audioLevelInterval) {
            clearInterval(audioLevelInterval);
            if (onAudioLevel) onAudioLevel(0); // Reset to 0
          }
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }
        };
        
        utterance.onerror = (event) => {
          console.error('Text-to-speech error:', event);
          if (audioLevelInterval) {
            clearInterval(audioLevelInterval);
            if (onAudioLevel) onAudioLevel(0); // Reset to 0
          }
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(`Speech synthesis failed: ${event.error}`));
          }
        };

        // Speak the text
        console.log('Starting speech synthesis...');
        window.speechSynthesis.speak(utterance);
        
        // Simple timeout-based resolution as backup
        // Estimate speech duration: average 150 words per minute, 5 chars per word
        const estimatedDuration = Math.max(2000, (text.length * 60) / (150 * 5) * 1000);
        const maxDuration = Math.min(estimatedDuration * 2, 15000); // Cap at 15 seconds
        
        console.log(`Estimated speech duration: ${estimatedDuration}ms, max timeout: ${maxDuration}ms`);
          setTimeout(() => {
          console.log('Checking speech status after estimated duration...');
          if (!hasResolved) {
            // Give a bit more time, then resolve
            setTimeout(() => {
              if (!hasResolved) {
                console.log('Speech timeout - resolving promise');
                if (audioLevelInterval) {
                  clearInterval(audioLevelInterval);
                  if (onAudioLevel) onAudioLevel(0); // Reset to 0
                }
                hasResolved = true;
                resolve();
              }
            }, 1000);
          }
        }, estimatedDuration);
      };

      // Check if voices are already loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        loadVoicesAndSpeak();
      } else {
        // Wait for voices to be loaded
        console.log('Waiting for voices to load...');
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('Voices loaded');
          loadVoicesAndSpeak();
        };
        
        // Fallback timeout in case onvoiceschanged doesn't fire
        setTimeout(() => {
          console.log('Voice loading timeout, proceeding anyway...');
          loadVoicesAndSpeak();        }, 1000);
      }
      
    } catch (error) {
      console.error('Error setting up text-to-speech:', error);
      reject(error);
    }
  });
};

// Get emergency phrases from backend
export const getEmergencyPhrases = async (language?: string): Promise<any[]> => {
  try {
    // Add translate=true parameter when language is specified and not English
    const needsTranslation = language && language !== 'en';
    const url = language 
      ? `${API_BASE_URL}/emergency-phrases?language=${language}${needsTranslation ? '&translate=true' : ''}`
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

    return await response.json();  } catch (error) {
    console.error('Contextual advice error:', error);
    throw error;
  }
};

// Sign Language to Translation Service
export interface SignToTranslationResult {
  detectedSign: string;
  translatedText: string;
  confidence: number;
  medicalContext: string;
  isEmergency: boolean;
}

export interface BatchSignResult {
  signs: Array<{
    gesture: string;
    confidence: number;
    timestamp: number;
  }>;
  combinedText: string;
  translatedText: string;
  medicalContext: string;
  isEmergency: boolean;
}

export const signToTranslation = async (
  signData: {
    gesture: string;
    confidence: number;
    timestamp: number;
  },
  targetLanguage: string = 'en'
): Promise<SignToTranslationResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sign-to-translation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signData,
        targetLanguage
      })
    });

    if (!response.ok) {
      throw new Error('Failed to translate sign language');
    }

    return await response.json();
  } catch (error) {
    console.error('Sign to translation error:', error);
    throw error;
  }
};

export const batchSignProcessing = async (
  signs: Array<{
    gesture: string;
    confidence: number;
    timestamp: number;
  }>,
  targetLanguage: string = 'en'
): Promise<BatchSignResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/batch-sign-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signs,
        targetLanguage
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process batch signs');
    }

    return await response.json();
  } catch (error) {
    console.error('Batch sign processing error:', error);
    throw error;
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('lifebridge_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
