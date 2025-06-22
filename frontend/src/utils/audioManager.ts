// Audio Manager to prevent sound spam and manage audio feedback
class AudioManager {
  private static instance: AudioManager;
  private lastAudioTime: number = 0;
  private isAudioEnabled: boolean = true;
  private currentAudioContext: AudioContext | null = null;
  private audioQueue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;
  
  // Throttling intervals (in milliseconds)
  private readonly SPEECH_THROTTLE = 2000; // 2 seconds between speech announcements
  private readonly TONE_THROTTLE = 500;    // 0.5 seconds between tone sounds
  private readonly EMERGENCY_THROTTLE = 1000; // 1 second between emergency sounds
  
  private constructor() {}
  
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
  
  public setAudioEnabled(enabled: boolean): void {
    this.isAudioEnabled = enabled;
    if (!enabled) {
      this.stopAllAudio();
    }
  }
  
  public isEnabled(): boolean {
    return this.isAudioEnabled;
  }
    // Throttled speech synthesis with queue management
  public async speakText(text: string, options: {
    volume?: number;
    rate?: number;
    priority?: 'low' | 'normal' | 'high' | 'emergency';
    language?: string;
  } = {}): Promise<void> {
    if (!this.isAudioEnabled || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }
    
    const now = Date.now();
    const throttleTime = options.priority === 'emergency' ? this.EMERGENCY_THROTTLE : this.SPEECH_THROTTLE;
    
    // Check if we should throttle this audio
    if (options.priority !== 'emergency' && now - this.lastAudioTime < throttleTime) {
      return Promise.resolve();
    }
    
    // Cancel previous speech for high priority audio
    if (options.priority === 'high' || options.priority === 'emergency') {
      try {
        speechSynthesis.cancel();
        // Wait a bit for cancellation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('Error cancelling speech:', error);
      }
    }
    
    this.lastAudioTime = now;
    
    return new Promise((resolve) => {
      try {
        // Validate text input
        if (!text || text.trim().length === 0) {
          resolve();
          return;
        }
        
        // Limit text length to prevent errors
        const limitedText = text.length > 200 ? text.substring(0, 200) + "..." : text;
        
        const utterance = new SpeechSynthesisUtterance(limitedText);
        utterance.volume = Math.min(Math.max(options.volume || 0.3, 0.1), 0.5); // Keep volume reasonable
        utterance.rate = Math.min(Math.max(options.rate || 1.0, 0.5), 2.0); // Reasonable rate limits
        utterance.pitch = 1.0; // Default pitch
        utterance.lang = options.language || 'en-US';
        
        let hasResolved = false;
        
        const resolveOnce = () => {
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }
        };
        
        utterance.onend = resolveOnce;
        utterance.onerror = (event) => {
          console.warn('Speech synthesis error (handled gracefully):', event.error);
          resolveOnce(); // Don't reject, just resolve silently
        };
        
        // Timeout fallback
        const timeout = setTimeout(resolveOnce, 5000); // 5 second timeout
        
        utterance.onend = () => {
          clearTimeout(timeout);
          resolveOnce();
        };
        
        utterance.onerror = (event) => {
          clearTimeout(timeout);
          console.warn('Speech synthesis error (handled gracefully):', event.error);
          resolveOnce();
        };
        
        // Check if speech synthesis is ready
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          // If currently speaking, queue this for later or skip for low priority
          if (options.priority === 'low') {
            resolve();
            return;
          }
          speechSynthesis.cancel();
          setTimeout(() => speechSynthesis.speak(utterance), 100);
        } else {
          speechSynthesis.speak(utterance);
        }
        
      } catch (error) {
        console.warn('Speech synthesis setup error (handled gracefully):', error);
        resolve(); // Don't reject, just resolve silently
      }
    });
  }
  
  // Throttled tone generation
  public playTone(frequency: number, duration: number, volume: number = 0.2, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    if (!this.isAudioEnabled) return;
    
    const now = Date.now();
    
    // Throttle non-priority tones
    if (priority === 'low' && now - this.lastAudioTime < this.TONE_THROTTLE) {
      return;
    }
    
    if (priority !== 'low') {
      this.lastAudioTime = now;
    }
    
    try {
      const audioContext = this.getAudioContext();
      if (!audioContext) return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Keep volume reasonable and add smooth fade
      const adjustedVolume = Math.min(volume, 0.3);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(adjustedVolume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  }
  
  // Play emergency audio with special handling
  public playEmergencyAlert(): void {
    if (!this.isAudioEnabled) return;
    
    const now = Date.now();
    if (now - this.lastAudioTime < this.EMERGENCY_THROTTLE) {
      return; // Throttle emergency sounds too
    }
    
    this.lastAudioTime = now;
    
    // Play urgent but not overwhelming emergency sound
    this.playTone(800, 0.15, 0.3, 'high');
    setTimeout(() => this.playTone(1000, 0.15, 0.3, 'high'), 200);
  }
  
  // Success sound for sign detection
  public playSuccessSound(): void {
    this.playTone(600, 0.1, 0.2, 'low');
    setTimeout(() => this.playTone(800, 0.1, 0.15, 'low'), 100);
  }
  
  // Warning sound for low confidence
  public playWarningSound(): void {
    this.playTone(400, 0.2, 0.2, 'low');
  }
    // Stop all audio
  public stopAllAudio(): void {
    try {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        // Wait a moment for cancellation to complete
        setTimeout(() => {
          if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
          }
        }, 100);
      }
      
      if (this.currentAudioContext && this.currentAudioContext.state !== 'closed') {
        try {
          this.currentAudioContext.close();
        } catch (contextError) {
          console.warn('Error closing audio context:', contextError);
        }
        this.currentAudioContext = null;
      }
    } catch (error) {
      console.warn('Error stopping audio (handled gracefully):', error);
    }
  }
    private getAudioContext(): AudioContext | null {
    try {
      if (!this.currentAudioContext || this.currentAudioContext.state === 'closed') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.warn('AudioContext not supported in this browser');
          return null;
        }
        this.currentAudioContext = new AudioContext();
        
        // Handle audio context state changes
        this.currentAudioContext.onstatechange = () => {
          if (this.currentAudioContext && this.currentAudioContext.state === 'suspended') {
            // Try to resume if suspended
            this.currentAudioContext.resume().catch(error => {
              console.warn('Failed to resume audio context:', error);
            });
          }
        };
      }
      return this.currentAudioContext;
    } catch (error) {
      console.warn('Failed to create audio context (handled gracefully):', error);
      return null;
    }
  }
  
  // Reset throttling (useful for mode switches)
  public resetThrottling(): void {
    this.lastAudioTime = 0;
  }
}

export const audioManager = AudioManager.getInstance();
