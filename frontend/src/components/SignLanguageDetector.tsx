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
  const [emergencyStartTime, setEmergencyStartTime] = useState<number | null>(null);
  const [lastGestureTime, setLastGestureTime] = useState<{[key: string]: number}>({});
  const [gestureStabilityBuffer, setGestureStabilityBuffer] = useState<{[key: string]: SignData[]}>({});

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
        drawHandLandmarks(canvasCtx, landmarks);        const gesture = analyzeGesture(landmarks);
        const confidence = calculateGestureConfidence(landmarks);
        
        // Only log when we detect a gesture or confidence is high
        if (gesture || confidence > 0.8) {
          console.log(`[SignLangDetector] Hand ${i}: gesture="${gesture}", confidence=${Math.round(confidence * 100)}%`);
        }

        if (gesture && confidence > 0.75) { // Increased threshold for better accuracy
          const signData: SignData = {
            landmarks: landmarks,
            confidence: confidence,
            gesture: gesture,
            timestamp: Date.now()
          };
            // Special handling for emergency gesture (requires 2-second hold)
          if (gesture === 'emergency') {
            const now = Date.now();
              if (!emergencyStartTime) {
              // First time detecting emergency gesture
              setEmergencyStartTime(now);
              console.log('[SignLangDetector] 🚨 EMERGENCY FIST detected - starting 2-second hold validation');
              setDetectionStatus(`🚨 EMERGENCY FIST detected - hold for 2 seconds... (${Math.round(confidence * 100)}%)`);
            } else {
              // Check if we've held the fist long enough
              const holdTime = now - emergencyStartTime;
              
              if (holdTime >= 2000) {
                // 2 seconds completed - trigger emergency
                console.log('[SignLangDetector] ✅ EMERGENCY CONFIRMED - 2 seconds completed');
                onSignDetected(signData);
                setDetectionStatus(`🚨 EMERGENCY CONFIRMED! (${Math.round(confidence * 100)}%)`);
                setEmergencyStartTime(null);
              } else {
                // Still holding, show countdown
                const secondsLeft = Math.ceil((2000 - holdTime) / 1000);
                setDetectionStatus(`🚨 Hold CLOSED FIST... ${secondsLeft}s remaining (${Math.round(confidence * 100)}%)`);
              }
            }
            continue; // Don't process other logic for emergency
          } else {
            // Cancel emergency timer if different gesture is detected
            if (emergencyStartTime) {
              setEmergencyStartTime(null);
              console.log('[SignLangDetector] Emergency hold cancelled - different gesture detected:', gesture);
            }
          }
          
          // For help gesture, require brief stability (1 second) to avoid false positives
          if (gesture === 'help') {
            const now = Date.now();
            const lastHelpTime = lastGestureTime['help'] || 0;
            
            if (now - lastHelpTime > 1000) { // 1 second stability for help
              onSignDetected(signData);
              setDetectionStatus(`🆘 HELP DETECTED! All fingers raised (${Math.round(confidence * 100)}%)`);
              setLastGestureTime(prev => ({ ...prev, help: now }));
            } else {
              const timeLeft = Math.ceil((1000 - (now - lastHelpTime)) / 1000);
              setDetectionStatus(`🆘 Hold all fingers up... ${timeLeft}s (${Math.round(confidence * 100)}%)`);
            }
            continue;
          }
          
          // For other gestures, use stability buffer (2-3 seconds for reliable detection)
          const now = Date.now();
          setGestureStabilityBuffer(prev => {
            const currentBuffer = prev[gesture] || [];
            const newBuffer = [...currentBuffer, signData].slice(-5); // Keep last 5 detections
            
            // Filter to recent detections (within 2.5 seconds)
            const recentDetections = newBuffer.filter(item => item.timestamp > now - 2500);
            
            // Check if gesture is stable (at least 3 detections in last 2.5 seconds with good confidence)
            const stableDetections = recentDetections.filter(item => item.confidence > 0.8);
            
            if (stableDetections.length >= 3) {
              const lastTriggered = lastGestureTime[gesture] || 0;
              
              // Prevent rapid-fire detections (3-second cooldown)
              if (now - lastTriggered > 3000) {
                onSignDetected(signData);
                setDetectionStatus(`✅ ${gesture.toUpperCase()} detected (${Math.round(confidence * 100)}%)`);
                setLastGestureTime(prev => ({ ...prev, [gesture]: now }));
              } else {
                const cooldownLeft = Math.ceil((3000 - (now - lastTriggered)) / 1000);
                setDetectionStatus(`⏳ ${gesture} cooldown: ${cooldownLeft}s (${Math.round(confidence * 100)}%)`);
              }
            } else {
              setDetectionStatus(`👀 Hold ${gesture} steady... ${stableDetections.length}/3 (${Math.round(confidence * 100)}%)`);
            }
            
            return { ...prev, [gesture]: newBuffer };
          });        } else if (gesture) {
          // Cancel emergency timer if gesture not confident enough
          if (emergencyStartTime) {
            setEmergencyStartTime(null);
            console.log('[SignLangDetector] Emergency hold cancelled - low confidence');
          }          setDetectionStatus(`🤔 Unclear gesture (${Math.round(confidence * 100)}%) - check hand position`);
        } else {
          // Cancel emergency timer if no gesture detected
          if (emergencyStartTime) {
            setEmergencyStartTime(null);
            console.log('[SignLangDetector] Emergency hold cancelled - no clear gesture detected');
          }
          setDetectionStatus(`👋 Position hand clearly - make distinct gesture`);
        }
      }    } else {
      // Cancel emergency timer if no hands detected
      if (emergencyStartTime) {
        setEmergencyStartTime(null);
        console.log('[SignLangDetector] Emergency hold cancelled - no hands detected');
      }
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
      const tipY = landmarks[tipIdx].y;
      const pipY = landmarks[pipIdx].y;
      return tipY < pipY - 0.03; // Lower y = higher position, strict threshold
    };

    // Improved thumb detection - MUCH more strict for fist detection
    const isThumbExtended = (): boolean => {
      if (!landmarks[thumbTip] || !landmarks[thumbMcp] || !landmarks[indexMcp] || !landmarks[wrist]) return false;
      
      // For a proper thumbs up, thumb should be:
      // 1. Significantly higher (lower y) than wrist
      // 2. Away from index finger horizontally
      // 3. Away from palm center
      
      const thumbToWristVertical = landmarks[wrist].y - landmarks[thumbTip].y;
      const thumbToIndexDistance = Math.abs(landmarks[thumbTip].x - landmarks[indexMcp].x);
      const palmCenterX = (landmarks[indexMcp].x + landmarks[pinkyMcp].x) / 2;
      const thumbToPalmDistance = Math.abs(landmarks[thumbTip].x - palmCenterX);
        // Very strict criteria for thumbs up
      const isThumbUp = thumbToWristVertical > 0.08 && // Thumb significantly above wrist
                        thumbToIndexDistance > 0.08 && // Far from index finger
                        thumbToPalmDistance > 0.06;    // Away from palm center
      
      // Only log when thumb detection changes or is unusual
      if (isThumbUp || thumbToWristVertical > 0.05) {
        console.log(`[ThumbDetection] thumbToWrist: ${thumbToWristVertical.toFixed(3)}, isUp: ${isThumbUp}`);
      }
      return isThumbUp;
    };

    // Check finger states    // Check finger states
    const thumbUp = isThumbExtended();
    const indexUp = isFingerExtended(indexTip, indexPip);
    const middleUp = isFingerExtended(middleTip, middlePip);
    const ringUp = isFingerExtended(ringTip, ringPip);
    const pinkyUp = isFingerExtended(pinkyTip, pinkyPip);

    // Count extended fingers
    const upCount = [thumbUp, indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

    // 🚨 Emergency: Closed fist (NO fingers extended) - HIGHEST PRIORITY
    if (upCount === 0) {
      // Additional strict validation for proper closed fist
      const wristPos = landmarks[wrist];
      const fingertips = [landmarks[thumbTip], landmarks[indexTip], landmarks[middleTip], landmarks[ringTip], landmarks[pinkyTip]];
        let properFistScore = 0;
      fingertips.forEach((tip, idx) => {
        if (tip) {
          const distanceToWrist = Math.sqrt(
            Math.pow(tip.x - wristPos.x, 2) + 
            Math.pow(tip.y - wristPos.y, 2)
          );
          // For a proper fist, fingertips should be close to wrist/palm
          if (distanceToWrist < 0.12) {
            properFistScore++;
          }
        }
      });
      
      // Need at least 4/5 fingertips close to wrist for a proper fist
      if (properFistScore >= 4) {
        console.log(`[GestureAnalysis] ✅ EMERGENCY FIST DETECTED - Score: ${properFistScore}/5`);
        return 'emergency';
      } else {
        console.log(`[GestureAnalysis] ❌ Not a proper fist - Score: ${properFistScore}/5`);
        return null;
      }
    }
    
    // If thumb is detected as up, be VERY strict about what constitutes other gestures
    if (thumbUp) {
      // ✅ Yes: ONLY thumbs up (all other fingers must be clearly down)
      if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
        // Additional validation: other fingers should be clearly folded
        const otherFingersDown = [
          landmarks[indexTip].y > landmarks[indexPip].y + 0.02,
          landmarks[middleTip].y > landmarks[middlePip].y + 0.02,
          landmarks[ringTip].y > landmarks[ringPip].y + 0.02,
          landmarks[pinkyTip].y > landmarks[pinkyPip].y + 0.02
        ].filter(Boolean).length;
        
        if (otherFingersDown >= 3) {
          console.log('[GestureAnalysis] ✅ YES (thumbs up) detected');
          return 'yes';
        } else {
          console.log(`[GestureAnalysis] ❌ Not clean thumbs up - only ${otherFingersDown}/4 fingers properly down`);
          return null;
        }
      }
        // � Pain: Thumb + index + middle (3 fingers - this is the common pain gesture)
      if (indexUp && middleUp && !ringUp && !pinkyUp && upCount === 3) {
        console.log('[GestureAnalysis] ✅ PAIN (3 fingers: thumb+index+middle) detected');
        return 'pain';
      }
      
      // 💊 Medicine: Thumb + pinky only (exactly 2 fingers)
      if (!indexUp && !middleUp && !ringUp && pinkyUp && upCount === 2) {
        console.log('[GestureAnalysis] ✅ MEDICINE (thumb + pinky) detected');
        return 'medicine';
      }
    }
      // Non-thumb gestures (thumb should be down/tucked)
    if (!thumbUp) {
      // 🆘 Help: All 4 fingers extended (thumb down) OR all 5 fingers
      if ((indexUp && middleUp && ringUp && pinkyUp && upCount === 4) || upCount === 5) {
        console.log(`[GestureAnalysis] ✅ HELP (${upCount} fingers up) detected`);
        return 'help';
      }
      
      // 💧 Water: Index + middle + ring fingers (3 fingers, like holding a cup)
      if (indexUp && middleUp && ringUp && !pinkyUp && upCount === 3) {
        console.log('[GestureAnalysis] ✅ WATER (3 fingers: index+middle+ring) detected');
        return 'water';
      }
      
      // 😣 Pain: Index + middle fingers only (2 fingers, alternative pattern)
      if (indexUp && middleUp && !ringUp && !pinkyUp && upCount === 2) {
        console.log('[GestureAnalysis] ✅ PAIN (2 fingers: index+middle) detected');
        return 'pain';
      }
      
      // �‍⚕️ Doctor: Index finger only
      if (indexUp && !middleUp && !ringUp && !pinkyUp && upCount === 1) {
        console.log('[GestureAnalysis] ✅ DOCTOR (index up) detected');
        return 'doctor';
      }
      
      // ❌ No: Index finger pointing (but check if it's pointing down for proper "no")
      if (indexUp && !middleUp && !ringUp && !pinkyUp && upCount === 1) {
        console.log('[GestureAnalysis] ✅ NO (index finger) detected');
        return 'no';
      }
    }    return null; // Unknown gesture
  };// Simplified and reliable confidence calculation
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
      // Clear emergency state on cleanup
      setEmergencyStartTime(null);
      setLastGestureTime({});
      setGestureStabilityBuffer({});
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
