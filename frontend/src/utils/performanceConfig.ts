// Performance configuration for AWS free tier optimization
export interface PerformanceConfig {
  translation: {
    timeout: number;
    retries: number;
    batchSize: number;
    cacheStrategy: 'aggressive' | 'conservative';
    priorityTerms: boolean;
  };
  signLanguage: {
    frameRate: number;
    confidenceThreshold: number;
    processingDelay: number;
    gestureBuffer: number;
  };
  audio: {
    sampleRate: number;
    bitrate: number;
    chunkSize: number;
    processingMode: 'realtime' | 'batch';
  };
  api: {
    concurrentRequests: number;
    requestDelay: number;
    cacheTTL: number;
    offlineMode: boolean;
  };
  emergency: {
    priorityKeywords: string[];
    maxResponseTime: number;
    redundantProcessing: boolean;
  };
}

// Emergency medical keywords for priority processing
const EMERGENCY_KEYWORDS = [
  'emergency', 'urgent', 'pain', 'heart', 'chest', 'breathe', 'breathing',
  'allergic', 'reaction', 'unconscious', 'bleeding', 'stroke', 'seizure',
  'overdose', 'poison', 'accident', 'trauma', 'critical', 'dying', 'help'
];

// AWS Free Tier Optimized Configurations
export const PERFORMANCE_CONFIGS: Record<'standard' | 'optimized', PerformanceConfig> = {
  // Standard Mode: Balanced performance, conservative resource usage
  standard: {
    translation: {
      timeout: 5000,           // 5 seconds timeout
      retries: 1,              // Single retry to save API calls
      batchSize: 1,            // Process one at a time
      cacheStrategy: 'conservative',
      priorityTerms: false,
    },
    signLanguage: {
      frameRate: 15,           // Lower frame rate for processing
      confidenceThreshold: 0.7, // Higher threshold, fewer false positives
      processingDelay: 200,    // 200ms delay between processing
      gestureBuffer: 3,        // Smaller buffer
    },
    audio: {
      sampleRate: 16000,       // Standard quality
      bitrate: 64,             // Compressed audio
      chunkSize: 1024,         // Smaller chunks
      processingMode: 'batch', // Process in batches
    },
    api: {
      concurrentRequests: 2,   // Limit concurrent requests
      requestDelay: 100,       // 100ms delay between requests
      cacheTTL: 300000,        // 5 minutes cache
      offlineMode: false,
    },
    emergency: {
      priorityKeywords: EMERGENCY_KEYWORDS.slice(0, 10), // Limited keywords
      maxResponseTime: 8000,   // 8 seconds max
      redundantProcessing: false,
    },
  },

  // Optimized Mode: Maximum performance for emergencies
  optimized: {
    translation: {
      timeout: 2000,           // 2 seconds timeout - fast response
      retries: 3,              // Multiple retries for reliability
      batchSize: 3,            // Process multiple simultaneously
      cacheStrategy: 'aggressive',
      priorityTerms: true,     // Priority processing for medical terms
    },
    signLanguage: {
      frameRate: 30,           // Higher frame rate for accuracy
      confidenceThreshold: 0.5, // Lower threshold, catch more gestures
      processingDelay: 50,     // 50ms delay - near real-time
      gestureBuffer: 5,        // Larger buffer for accuracy
    },
    audio: {
      sampleRate: 44100,       // High quality audio
      bitrate: 128,            // Higher bitrate
      chunkSize: 2048,         // Larger chunks
      processingMode: 'realtime', // Real-time processing
    },
    api: {
      concurrentRequests: 5,   // More concurrent requests
      requestDelay: 0,         // No delay - maximum speed
      cacheTTL: 600000,        // 10 minutes cache
      offlineMode: false,
    },
    emergency: {
      priorityKeywords: EMERGENCY_KEYWORDS, // All emergency keywords
      maxResponseTime: 3000,   // 3 seconds max for emergencies
      redundantProcessing: true, // Parallel processing for reliability
    },
  },
};

// Helper function to get current performance config
export const getPerformanceConfig = (mode: 'standard' | 'optimized'): PerformanceConfig => {
  return PERFORMANCE_CONFIGS[mode];
};

// Helper function to check if text contains emergency keywords
export const isEmergencyText = (text: string, mode: 'standard' | 'optimized'): boolean => {
  const config = getPerformanceConfig(mode);
  const lowerText = text.toLowerCase();
  return config.emergency.priorityKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
};

// Helper function to calculate API request delay based on free tier limits
export const calculateRequestDelay = (mode: 'standard' | 'optimized', isEmergency: boolean): number => {
  const config = getPerformanceConfig(mode);
  
  // In emergency situations, reduce delay even further
  if (isEmergency && mode === 'optimized') {
    return 0;
  }
  
  return config.api.requestDelay;
};

// Helper function to determine if we should use cache
export const shouldUseCache = (mode: 'standard' | 'optimized', text: string): boolean => {
  const config = getPerformanceConfig(mode);
  const isEmergency = isEmergencyText(text, mode);
  
  // In emergency situations with optimized mode, skip cache for fresh translations
  if (isEmergency && mode === 'optimized') {
    return false;
  }
  
  return config.translation.cacheStrategy === 'aggressive' || 
         config.translation.cacheStrategy === 'conservative';
};

// AWS Free Tier Limits (12-month period)
export const AWS_FREE_TIER_LIMITS = {
  bedrock: {
    tokensPerMonth: 500000,      // Nova Micro free tier
    requestsPerMinute: 10,       // Conservative estimate
    requestsPerDay: 1000,        // Conservative daily limit
  },
  translate: {
    charactersPerMonth: 2000000, // 2M characters free
    requestsPerMinute: 20,       // Higher rate limit
    requestsPerDay: 5000,        // Conservative daily limit
  },
  polly: {
    charactersPerMonth: 5000000, // 5M characters free
    requestsPerMinute: 15,       // Voice synthesis rate
  },
  comprehend: {
    requestsPerMonth: 50000,     // 50K requests free
    requestsPerMinute: 5,        // Lower rate for language detection
  }
};

// Request tracking for AWS free tier management
export class AWSUsageTracker {
  private static instance: AWSUsageTracker;
  private usage: Map<string, { count: number, lastReset: number }> = new Map();
  
  static getInstance(): AWSUsageTracker {
    if (!AWSUsageTracker.instance) {
      AWSUsageTracker.instance = new AWSUsageTracker();
    }
    return AWSUsageTracker.instance;
  }
  
  trackRequest(service: keyof typeof AWS_FREE_TIER_LIMITS): boolean {
    const now = Date.now();
    const key = `${service}_${Math.floor(now / (1000 * 60))}`; // Per minute tracking
    
    const current = this.usage.get(key) || { count: 0, lastReset: now };
    current.count++;
    this.usage.set(key, current);
    
    const limit = AWS_FREE_TIER_LIMITS[service].requestsPerMinute;
    
    if (current.count > limit) {
      console.warn(`AWS ${service} rate limit approached: ${current.count}/${limit} requests per minute`);
      return false; // Should throttle
    }
    
    return true; // OK to proceed
  }
  
  getUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    const now = Date.now();
    const currentMinute = Math.floor(now / (1000 * 60));
    
    Object.keys(AWS_FREE_TIER_LIMITS).forEach(service => {
      const key = `${service}_${currentMinute}`;
      const usage = this.usage.get(key);
      stats[service] = usage?.count || 0;
    });
    
    return stats;
  }
}

// Helper function to determine optimal service based on performance mode and usage
export const selectOptimalService = (
  text: string,
  performanceMode: 'standard' | 'optimized',
  context?: string
): 'translate' | 'bedrock' => {
  const tracker = AWSUsageTracker.getInstance();
  const isEmergency = isEmergencyText(text, performanceMode);
  
  // In emergencies with optimized mode, prefer faster Amazon Translate
  if (isEmergency && performanceMode === 'optimized') {
    return tracker.trackRequest('translate') ? 'translate' : 'bedrock';
  }
  
  // For complex medical terms, prefer Bedrock if quota allows
  if (context === 'medication' || text.length > 200) {
    return tracker.trackRequest('bedrock') ? 'bedrock' : 'translate';
  }
  
  // Default to Amazon Translate for cost efficiency
  return tracker.trackRequest('translate') ? 'translate' : 'bedrock';
};
