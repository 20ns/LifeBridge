import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface SignAnimationPlayerProps {
  text: string;
  language?: string;
  autoPlay?: boolean;
  className?: string;
  onAnimationComplete?: () => void;
}

interface SignKeyframe {
  gesture: string;
  duration: number;
  description: string;
  handShape: string;
  movement: string;
}

const SignAnimationPlayer: React.FC<SignAnimationPlayerProps> = ({
  text,
  language = 'en',
  autoPlay = false,
  className = '',
  onAnimationComplete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [signSequence, setSignSequence] = useState<SignKeyframe[]>([]);  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [lastAudioFrame, setLastAudioFrame] = useState(-1); // Track last frame that played audio
  const animationRef = useRef<number | null>(null);
  const frameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Basic medical sign mappings for emergency phrases
  const medicalSignMappings: { [key: string]: SignKeyframe[] } = {
    'emergency': [
      {
        gesture: 'EMERGENCY',
        duration: 2000,
        description: 'Make fist, shake urgently',
        handShape: 'Closed fist',
        movement: 'Rapid up-down motion'
      }
    ],
    'help': [
      {
        gesture: 'HELP',
        duration: 1500,
        description: 'Open hand, wave',
        handShape: 'Open palm',
        movement: 'Side-to-side wave'
      }
    ],
    'pain': [
      {
        gesture: 'PAIN',
        duration: 1800,
        description: 'Point with two fingers',
        handShape: 'Index and middle finger extended',
        movement: 'Point to affected area'
      }
    ],
    'medicine': [
      {
        gesture: 'MEDICINE',
        duration: 2000,
        description: 'Thumb and pinky gesture',
        handShape: 'Thumb and pinky extended',
        movement: 'Slight shake'
      }
    ],
    'doctor': [
      {
        gesture: 'DOCTOR',
        duration: 1500,
        description: 'Point upward with index',
        handShape: 'Index finger pointing up',
        movement: 'Static upward point'
      }
    ],
    'water': [
      {
        gesture: 'WATER',
        duration: 1500,
        description: 'Three fingers up',
        handShape: 'Thumb, index, middle fingers',
        movement: 'Bring to mouth motion'
      }
    ],
    'yes': [
      {
        gesture: 'YES',
        duration: 1000,
        description: 'Thumbs up',
        handShape: 'Thumb up, fist closed',
        movement: 'Static thumb up'
      }
    ],
    'no': [
      {
        gesture: 'NO',
        duration: 1000,
        description: 'Index finger down',
        handShape: 'Index finger pointing down',
        movement: 'Side-to-side shake'
      }
    ]
  };

  // Convert text to sign sequence
  useEffect(() => {
    const generateSignSequence = (inputText: string): SignKeyframe[] => {
      const words = inputText.toLowerCase().split(' ');
      const sequence: SignKeyframe[] = [];

      for (const word of words) {
        // Check for exact matches first
        if (medicalSignMappings[word]) {
          sequence.push(...medicalSignMappings[word]);
        }
        // Check for partial matches in medical context
        else if (word.includes('emergency') || inputText.includes('EMERGENCY')) {
          sequence.push(...medicalSignMappings['emergency']);
        }
        else if (word.includes('help') || word.includes('assist')) {
          sequence.push(...medicalSignMappings['help']);
        }
        else if (word.includes('pain') || word.includes('hurt')) {
          sequence.push(...medicalSignMappings['pain']);
        }
        else if (word.includes('medicine') || word.includes('medication') || word.includes('drug')) {
          sequence.push(...medicalSignMappings['medicine']);
        }
        else if (word.includes('doctor') || word.includes('physician') || word.includes('nurse')) {
          sequence.push(...medicalSignMappings['doctor']);
        }
        else if (word.includes('water') || word.includes('drink')) {
          sequence.push(...medicalSignMappings['water']);
        }
        else if (word.includes('yes') || word.includes('ok') || word.includes('agree')) {
          sequence.push(...medicalSignMappings['yes']);
        }
        else if (word.includes('no') || word.includes('not') || word.includes('refuse')) {
          sequence.push(...medicalSignMappings['no']);
        }
        else {
          // Default gesture for unknown words
          sequence.push({
            gesture: word.toUpperCase(),
            duration: 1500,
            description: `Fingerspell: ${word}`,
            handShape: 'Fingerspelling',
            movement: 'Letter-by-letter spelling'
          });
        }
      }

      return sequence.length > 0 ? sequence : [{
        gesture: 'UNKNOWN',
        duration: 2000,
        description: 'Text cannot be signed',
        handShape: 'Open palms',
        movement: 'Shrug gesture'
      }];
    };

    const sequence = generateSignSequence(text);
    setSignSequence(sequence);
    setIsLoaded(true);
    setCurrentFrame(0);
  }, [text]);
  // Auto-play when ready
  useEffect(() => {
    if (autoPlay && isLoaded && signSequence.length > 0) {
      startAnimation();
    }
  }, [autoPlay, isLoaded, signSequence]);

  // Sync audio manager with local audio setting
  useEffect(() => {
    audioManager.setAudioEnabled(isAudioEnabled);
  }, [isAudioEnabled]);

  const startAnimation = () => {
    if (signSequence.length === 0) return;
    
    setIsPlaying(true);
    playFrame(0);
  };
  const playFrame = (frameIndex: number) => {
    if (frameIndex >= signSequence.length) {
      setIsPlaying(false);
      setCurrentFrame(0);
      setLastAudioFrame(-1); // Reset audio frame tracking
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return;
    }

    setCurrentFrame(frameIndex);
    
    // Only play audio for significant frames (every 3rd frame or important gestures)
    // This reduces audio spam while keeping useful feedback
    const shouldPlayAudio = isAudioEnabled && (
      frameIndex === 0 || // First frame
      frameIndex === signSequence.length - 1 || // Last frame
      frameIndex % 3 === 0 || // Every 3rd frame
      signSequence[frameIndex].gesture.toLowerCase().includes('emergency') ||
      frameIndex !== lastAudioFrame // Don't repeat same frame
    );
    
    if (shouldPlayAudio) {
      setLastAudioFrame(frameIndex);
      const currentGesture = signSequence[frameIndex];
      
      // Use audio manager for controlled speech
      const priority = currentGesture.gesture.toLowerCase().includes('emergency') ? 'emergency' : 'low';
      const text = `${currentGesture.gesture}`;
      
      audioManager.speakText(text, {
        volume: 0.3,
        rate: playbackSpeed * 1.1, // Slightly faster than animation for better sync
        priority: priority as 'low' | 'emergency'
      }).catch(error => {
        console.warn('Failed to play sign audio:', error);
      });
    }

    const frameDuration = signSequence[frameIndex].duration / playbackSpeed;
    
    frameTimeoutRef.current = setTimeout(() => {
      playFrame(frameIndex + 1);
    }, frameDuration);
  };
  const pauseAnimation = () => {
    setIsPlaying(false);
    if (frameTimeoutRef.current) {
      clearTimeout(frameTimeoutRef.current);
    }
    // Stop any ongoing audio when pausing
    audioManager.stopAllAudio();
  };

  const resetAnimation = () => {
    pauseAnimation();
    setCurrentFrame(0);
    setLastAudioFrame(-1); // Reset audio tracking
    audioManager.resetThrottling(); // Reset audio throttling for fresh start
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAnimation();
    } else {
      if (currentFrame >= signSequence.length) {
        resetAnimation();
      } else {
        startAnimation();
      }
    }
  };

  const getCurrentGesture = () => {
    if (signSequence.length === 0 || currentFrame >= signSequence.length) {
      return null;
    }
    return signSequence[currentFrame];
  };

  const currentGesture = getCurrentGesture();

  if (!isLoaded) {
    return (
      <div className={`sign-animation-player loading ${className}`}>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Preparing sign animation...</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`sign-animation-player ${isAudioEnabled ? 'audio-optimized' : ''} ${className}`}>
      {/* Animation Display */}
      <div className="animation-display">
        <div className="gesture-visualization">
          {currentGesture ? (
            <div className="gesture-frame">
              <div className="hand-shape">
                <div className={`hand-icon ${currentGesture.gesture.toLowerCase()}`}>
                  {/* Visual representation of hand gesture */}
                  <div className="hand-visual">
                    {getHandVisual(currentGesture.handShape)}
                  </div>
                </div>
              </div>
              <div className="gesture-info">
                <h4 className="gesture-name">{currentGesture.gesture}</h4>
                <p className="gesture-description">{currentGesture.description}</p>
                <div className="gesture-details">
                  <span className="hand-shape-info">Hand: {currentGesture.handShape}</span>
                  <span className="movement-info">Movement: {currentGesture.movement}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-gesture">
              <span>No gesture to display</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="animation-controls">
        <button
          onClick={togglePlayPause}
          className="control-btn play-pause"
          disabled={signSequence.length === 0}
        >
          {isPlaying ? <Pause className="icon" /> : <Play className="icon" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={resetAnimation}
          className="control-btn reset"
          disabled={signSequence.length === 0}
        >
          <RotateCcw className="icon" />
          <span>Reset</span>
        </button>        <button
          onClick={() => {
            const newAudioState = !isAudioEnabled;
            setIsAudioEnabled(newAudioState);
            audioManager.setAudioEnabled(newAudioState);
            if (!newAudioState) {
              audioManager.stopAllAudio();
            }
          }}
          className={`control-btn audio-toggle ${isAudioEnabled ? 'enabled' : ''}`}
          title={isAudioEnabled ? 'Disable audio feedback' : 'Enable audio feedback'}
        >
          {isAudioEnabled ? <Volume2 className="icon" /> : <VolumeX className="icon" />}
          <span>{isAudioEnabled ? 'Audio On' : 'Audio Off'}</span>
        </button>

        <div className="speed-control">
          <label>Speed:</label>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="speed-select"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-track">
          <div 
            className="progress-fill"
            style={{ 
              width: `${signSequence.length > 0 ? (currentFrame / signSequence.length) * 100 : 0}%` 
            }}
          />
        </div>
        <div className="frame-info">
          Frame {currentFrame + 1} of {signSequence.length}
        </div>
      </div>

      {/* Gesture Sequence Preview */}
      <div className="sequence-preview">
        <h5>Sign Sequence:</h5>
        <div className="sequence-list">
          {signSequence.map((gesture, index) => (
            <div
              key={index}
              className={`sequence-item ${index === currentFrame ? 'current' : ''} ${index < currentFrame ? 'completed' : ''}`}
              onClick={() => {
                if (!isPlaying) {
                  setCurrentFrame(index);
                }
              }}
            >
              <span className="gesture-name">{gesture.gesture}</span>
              <span className="gesture-duration">{gesture.duration}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to get visual representation of hand shape
const getHandVisual = (handShape: string): string => {
  const handShapes: { [key: string]: string } = {
    'Closed fist': '✊',
    'Open palm': '🖐️',
    'Index finger pointing up': '☝️',
    'Thumb up, fist closed': '👍',
    'Index finger pointing down': '👇',
    'Index and middle finger extended': '✌️',
    'Thumb and pinky extended': '🤟',
    'Thumb, index, middle fingers': '🤘',
    'Fingerspelling': '👋',
    'Open palms': '🙌'
  };

  return handShapes[handShape] || '👋';
};

export default SignAnimationPlayer;
