import React, { useRef, useEffect, useState, useCallback } from 'react';
// Import MediaPipe solutions properly
// Import MediaPipe libraries via CDN to avoid bundling issues
const loadMediaPipe = async () => {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
    script.onload = () => {
      const cameraScript = document.createElement('script');
      cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      cameraScript.onload = () => resolve();
      document.head.appendChild(cameraScript);
    };
    document.head.appendChild(script);
  });
};

// Declare global MediaPipe types
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

interface SignLanguageDetectorProps {
  onSignDetected: (signData: SignData) => void;
  isActive: boolean;
  medicalContext?: string;
}

interface SignData {
  landmarks: any[]; // Consider defining a more specific type for landmarks
  confidence: number;
  gesture: string;
  timestamp: number;
}

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

const SignLanguageDetector: React.FC<SignLanguageDetectorProps> = ({
  onSignDetected,
  isActive,
  medicalContext = 'general' // medicalContext is available but not used in current gesture logic
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hands, setHands] = useState<any>(null);
  const [camera, setCamera] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>('Initializing...');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gestureBuffer, setGestureBuffer] = useState<SignData[]>([]);
  const [emergencyTimer, setEmergencyTimer] = useState<NodeJS.Timeout | null>(null);

  const medicalGestures = {
    'pain': { name: 'Pain', priority: 'high' },
    'help': { name: 'Help', priority: 'critical' },
    'yes': { name: 'Yes', priority: 'medium' },
    'no': { name: 'No', priority: 'medium' },
    'water': { name: 'Water', priority: 'medium' },
    'medicine': { name: 'Medicine', priority: 'high' },
    'doctor': { name: 'Doctor', priority: 'high' },
    'emergency': { name: 'Emergency', priority: 'critical' }
  };

  // Process hand detection results
  const onResults = useCallback((results: any) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.image && canvasRef.current) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i] as HandLandmark[];
        drawHandLandmarks(canvasCtx, landmarks);
        const gesture = analyzeGesture(landmarks);
        const confidence = calculateGestureConfidence(landmarks);
        
        // Debug logging
        console.log(`[SignLangDetector] Hand ${i}: gesture=${gesture}, confidence=${Math.round(confidence * 100)}%`);

        if (gesture && confidence > 0.75) { // Increased threshold for better accuracy
          const signData: SignData = {
            landmarks: landmarks,
            confidence: confidence,
            gesture: gesture,
            timestamp: Date.now()
          };
          
          // Special handling for emergency gesture (requires 2-second hold)
          if (gesture === 'emergency') {
            if (!emergencyTimer) {
              console.log('[SignLangDetector] Emergency gesture detected - starting 2-second timer');
              setDetectionStatus(`🚨 Emergency detected - hold fist for 2 seconds... (${Math.round(confidence * 100)}%)`);
              
              const timer = setTimeout(() => {
                console.log('[SignLangDetector] Emergency confirmed - 2 seconds completed');
                onSignDetected(signData);
                setDetectionStatus(`🚨 EMERGENCY CONFIRMED! (${Math.round(confidence * 100)}%)`);
                setEmergencyTimer(null);
              }, 2000);
              
              setEmergencyTimer(timer);
            } else {
              setDetectionStatus(`🚨 Hold fist steady... (${Math.round(confidence * 100)}%)`);
            }
            continue; // Don't process other logic for emergency
          } else {
            // Cancel emergency timer if different gesture is detected
            if (emergencyTimer) {
              clearTimeout(emergencyTimer);
              setEmergencyTimer(null);
              console.log('[SignLangDetector] Emergency timer cancelled - different gesture detected');
            }
          }
          
          // For help gesture, trigger immediately (no buffer needed)
          if (gesture === 'help') {
            onSignDetected(signData);
            setDetectionStatus(`🆘 HELP DETECTED! Wave all fingers (${Math.round(confidence * 100)}%)`);
            continue;
          }
          
          // For other gestures, use buffer for stability
          setGestureBuffer(prev => {
            const newBuffer = [...prev, signData].slice(-3);
            const recentSameGestures = newBuffer.filter(
              item => item.gesture === gesture && item.timestamp > Date.now() - 1000
            );
            
            if (recentSameGestures.length >= 2) {
              onSignDetected(signData);
              setDetectionStatus(`✅ ${gesture.toUpperCase()} detected (${Math.round(confidence * 100)}%)`);
            } else {
              setDetectionStatus(`👀 Recognizing ${gesture}... (${Math.round(confidence * 100)}%)`);
            }
            return newBuffer;
          });
        } else if (gesture) {
          // Cancel emergency timer if gesture not confident enough
          if (emergencyTimer) {
            clearTimeout(emergencyTimer);
            setEmergencyTimer(null);
          }
          setDetectionStatus(`🤔 Low confidence ${gesture} (${Math.round(confidence * 100)}%) - hold steady`);
        } else {
          // Cancel emergency timer if no gesture detected
          if (emergencyTimer) {
            clearTimeout(emergencyTimer);
            setEmergencyTimer(null);
          }
          setDetectionStatus(`👋 Make a clear gesture`);
        }
      }} else {
      setDetectionStatus('👋 No hands detected - show your hands to the camera');
      // Debug info when no hands are detected
      console.log('[SignLangDetector] No hands detected in frame');
    }
    canvasCtx.restore();
  }, [onSignDetected]);

  // Draw hand landmarks on canvas
  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: HandLandmark[]) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm connections
    ];
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      if (startPoint && endPoint) { // Ensure landmarks exist
        ctx.beginPath();
        ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
        ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
        ctx.stroke();
      }
    });
    ctx.fillStyle = '#ff0000';
    landmarks.forEach(landmark => {
      if (landmark) { // Ensure landmark exists
        ctx.beginPath();
        ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };  // Proper gesture analysis based on medical sign language specifications
  const analyzeGesture = (landmarks: HandLandmark[]): string | null => {
    if (!landmarks || landmarks.length !== 21) return null;
    
    // Hand landmark indices
    const thumbTip = 4, thumbMcp = 2;
    const indexTip = 8, indexPip = 6, indexMcp = 5;
    const middleTip = 12, middlePip = 10, middleMcp = 9;
    const ringTip = 16, ringPip = 14, ringMcp = 13;
    const pinkyTip = 20, pinkyPip = 18, pinkyMcp = 17;
    const wrist = 0;

    // Helper function to check if finger is extended (tip higher than pip)
    const isFingerExtended = (tipIdx: number, pipIdx: number): boolean => {
      if (!landmarks[tipIdx] || !landmarks[pipIdx]) return false;
      return landmarks[tipIdx].y < landmarks[pipIdx].y; // Lower y = higher position
    };

    // Special thumb check (different anatomy - check horizontal distance)
    const isThumbExtended = (): boolean => {
      if (!landmarks[thumbTip] || !landmarks[thumbMcp] || !landmarks[indexMcp]) return false;
      const thumbToIndexDistance = Math.abs(landmarks[thumbTip].x - landmarks[indexMcp].x);
      return thumbToIndexDistance > 0.05; // Threshold for thumb being away from hand
    };

    // Check finger states
    const thumbUp = isThumbExtended();
    const indexUp = isFingerExtended(indexTip, indexPip);
    const middleUp = isFingerExtended(middleTip, middlePip);
    const ringUp = isFingerExtended(ringTip, ringPip);
    const pinkyUp = isFingerExtended(pinkyTip, pinkyPip);

    // Count extended fingers
    const extendedFingers = [thumbUp, indexUp, middleUp, ringUp, pinkyUp];
    const upCount = extendedFingers.filter(Boolean).length;

    // Gesture recognition based on specifications
    
    // 🚨 Emergency: Closed fist (no fingers extended)
    if (upCount === 0) {
      return 'emergency';
    }
    
    // 🆘 Help: All fingers extended
    if (upCount === 5 && thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
      return 'help';
    }
    
    // ✅ Yes: Thumbs up only
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
      return 'yes';
    }
    
    // 👩‍⚕️ Doctor: Index finger pointing up only
    if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
      return 'doctor';
    }
    
    // 😣 Pain: Two fingers (index + middle) 
    if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
      return 'pain';
    }
    
    // 💧 Water: Three fingers (thumb + index + middle)
    if (thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
      return 'water';
    }
    
    // 💊 Medicine: Thumb + pinky only
    if (thumbUp && !indexUp && !middleUp && !ringUp && pinkyUp) {
      return 'medicine';
    }
    
    // ❌ No: Check if pointing downward (index finger with negative y velocity)
    if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
      // If index is pointing down (higher y value than normal)
      if (landmarks[indexTip].y > landmarks[indexMcp].y + 0.02) {
        return 'no';
      }
    }

    return null; // Unknown gesture
  };  // Simplified and reliable confidence calculation
  const calculateGestureConfidence = (landmarks: HandLandmark[]): number => {
    if (!landmarks || landmarks.length !== 21) return 0;
    
    // Check if all landmarks are present and within bounds
    let validLandmarks = 0;
    for (const landmark of landmarks) {
      if (landmark && 
          landmark.x >= 0 && landmark.x <= 1 && 
          landmark.y >= 0 && landmark.y <= 1 &&
          landmark.z !== undefined) {
        validLandmarks++;
      }
    }
    
    // Base confidence on landmark completeness
    const completeness = validLandmarks / landmarks.length;
    
    // Additional confidence based on hand stability
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    if (!wrist || !middleMcp) return completeness * 0.7;
    
    // Check if hand is reasonably sized (not too small/large in frame)
    const handSize = Math.sqrt(
      Math.pow(wrist.x - middleMcp.x, 2) + 
      Math.pow(wrist.y - middleMcp.y, 2)
    );
    
    const sizeScore = handSize > 0.05 && handSize < 0.5 ? 1.0 : 0.8;
    
    return Math.min(0.95, completeness * sizeScore);
  };

  // Initialize MediaPipe Hands
  useEffect(() => {
    const initializeMediaPipe = async () => {
      console.log('[SignLangDetector] Loading MediaPipe scripts...');
      await loadMediaPipe();
      console.log('[SignLangDetector] MediaPipe scripts loaded');
      
      // @ts-ignore - Global objects from CDN
      const Hands = window.Hands;
      // @ts-ignore - Global objects from CDN
      const Camera = window.Camera;
      
      const handsInstance = new Hands({
        locateFile: (file: string) => {
          console.log(`[SignLangDetector] Locating MediaPipe file: ${file}`);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
        handsInstance.setOptions({
        maxNumHands: 1, // Focus on one hand for better accuracy
        modelComplexity: 1,
        minDetectionConfidence: 0.7, // Increased for better quality
        minTrackingConfidence: 0.5
      });
      
      handsInstance.onResults(onResults);
      setHands(handsInstance);
      setDetectionStatus('MediaPipe initialized. Ready for detection.');
      setIsInitialized(true);
      console.log('[SignLangDetector] MediaPipe initialized successfully');
      
      return { Hands, Camera };
    };

    if (isActive) {
      console.log('[SignLangDetector] isActive is true, initializing MediaPipe');
      initializeMediaPipe().then(({ Camera }) => {
        if (videoRef.current && !camera) {
          console.log('[SignLangDetector] Initializing camera...');
          const cameraInstance = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && hands) {
                try {
                  await hands.send({ image: videoRef.current });
                } catch (error) {
                  console.error('[SignLangDetector] Error sending frame to Hands:', error);
                }
              }
            },
            width: 640,
            height: 480
          });
          
          cameraInstance.start()
            .then(() => {
              setCamera(cameraInstance);
              setDetectionStatus('Camera started - show your hands');
              console.log('[SignLangDetector] Camera started successfully');
            })
            .catch((error: any) => {
              console.error('[SignLangDetector] Failed to start camera:', error);
              setDetectionStatus('Error: Failed to start camera');
            });
        }
      }).catch(error => {
        console.error('[SignLangDetector] MediaPipe initialization failed:', error);
        setDetectionStatus('Error: Failed to initialize MediaPipe');
      });
    } else {
      console.log('[SignLangDetector] isActive is false, skipping initialization');
      if (camera) {
        console.log('[SignLangDetector] Stopping camera');
        camera.stop();
        setCamera(null);
      }
      if (hands) {
        console.log('[SignLangDetector] Closing Hands');
        hands.close();
        setHands(null);
      }
    }    return () => {
      console.log('[SignLangDetector] Cleanup: Stopping camera and closing Hands if active.');
      if (camera) {
        camera.stop();
        console.log('[SignLangDetector] Camera stopped during cleanup.');
      }
      if (hands) {
        hands.close().then(() => console.log('[SignLangDetector] MediaPipe Hands closed during cleanup.'));
      }
      if (emergencyTimer) {
        clearTimeout(emergencyTimer);
        setEmergencyTimer(null);
        console.log('[SignLangDetector] Emergency timer cleared during cleanup.');
      }
    };
  }, [isActive, onResults]);

  // Start camera when hands is initialized
  useEffect(() => {
    console.log('[SignLangDetector] Camera useEffect triggered. Hands:', !!hands, 'VideoRef:', !!videoRef.current, 'isActive:', isActive);
    if (hands && videoRef.current && isActive && !camera) { // Ensure camera isn't already set up
      console.log('[SignLangDetector] Initializing camera...');
      const cameraInstance = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && hands) {
            try {
              await hands.send({ image: videoRef.current });
            } catch (error) {
              console.error('[SignLangDetector] Error sending frame to Hands:', error);
            }
          }
        },
        width: 640,
        height: 480
      });

      cameraInstance.start()
        .then(() => {
          setCamera(cameraInstance);
          setDetectionStatus('Camera started - show your hands');
          console.log('[SignLangDetector] Camera started successfully.');
        })
        .catch((error: any) => {
          console.error('[SignLangDetector] Failed to start camera:', error);
          setDetectionStatus('Error: Failed to start camera.');
        });
    } else {
      if (!hands) console.log('[SignLangDetector] Camera not started: Hands not initialized.');
      if (!videoRef.current) console.log('[SignLangDetector] Camera not started: videoRef not available.');
      if (!isActive) console.log('[SignLangDetector] Camera not started: isActive is false.');
      if (camera && isActive) console.log('[SignLangDetector] Camera already initialized and active.');
    }
  }, [hands, isActive, camera]); // Added camera to dependencies to prevent re-initialization

  if (!isActive && !isInitialized) { // Show disabled message if not active and not even initialized
    return (
      <div className="sign-language-detector disabled">
        <div className="status">Sign language detection is disabled. Click "Start Detection".</div>
      </div>
    );
  }
  
  return (
    <div className="sign-language-detector">
      <div className="detection-header" style={{
        textAlign: 'center',
        fontSize: '1.2rem',
        marginBottom: '16px',
        fontWeight: 500,
        color: '#1a73e8'
      }}>
        <div className="status">{detectionStatus}</div>
      </div>
      
      <div className="video-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%'
      }}>
        <video
          ref={videoRef}
          className="input-video"
          style={{ display: 'none' }}
          playsInline
          autoPlay
          muted
        />
        <canvas
          ref={canvasRef}
          className="output-canvas"
          width={640}
          height={480}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: isActive ? 'block' : 'none',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '2px solid #3a86ff',
            backgroundColor: '#f0f9ff'
          }}
        />
      </div>
    </div>
  );
};

export default SignLanguageDetector;
