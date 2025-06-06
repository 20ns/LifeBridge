import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface SignLanguageDetectorProps {
  onSignDetected: (signData: SignData) => void;
  isActive: boolean;
  medicalContext?: string;
}

interface SignData {
  landmarks: any[];
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
  medicalContext = 'general'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hands, setHands] = useState<Hands | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>('Initializing...');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gestureBuffer, setGestureBuffer] = useState<SignData[]>([]);

  // Medical sign language gestures - simplified for emergency use
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

  // Initialize MediaPipe Hands
  useEffect(() => {
    const initializeHands = async () => {
      try {
        const handsInstance = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        handsInstance.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        handsInstance.onResults(onResults);
        setHands(handsInstance);
        setDetectionStatus('Ready for sign detection');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize MediaPipe Hands:', error);
        setDetectionStatus('Failed to initialize camera');
      }
    };

    if (isActive) {
      initializeHands();
    }

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, [isActive]);

  // Start camera when hands is initialized
  useEffect(() => {
    if (hands && videoRef.current && isActive) {
      const cameraInstance = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      cameraInstance.start();
      setCamera(cameraInstance);
      setDetectionStatus('Camera started - show your hands');
    }
  }, [hands, isActive]);

  // Process hand detection results
  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw video frame
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Process detected hands
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness?.[i];
        
        // Draw hand landmarks
        drawHandLandmarks(canvasCtx, landmarks);
        
        // Analyze gesture
        const gesture = analyzeGesture(landmarks);
        const confidence = calculateGestureConfidence(landmarks);
        
        if (gesture && confidence > 0.7) {
          const signData: SignData = {
            landmarks: landmarks,
            confidence: confidence,
            gesture: gesture,
            timestamp: Date.now()
          };

          // Add to gesture buffer for stability
          setGestureBuffer(prev => {
            const newBuffer = [...prev, signData].slice(-5); // Keep last 5 detections
            
            // Check for consistent gesture
            const recentSameGestures = newBuffer.filter(
              item => item.gesture === gesture && 
              item.timestamp > Date.now() - 1000 // Within last second
            );

            if (recentSameGestures.length >= 3) {
              onSignDetected(signData);
              setDetectionStatus(`Detected: ${gesture} (${Math.round(confidence * 100)}%)`);
            }

            return newBuffer;
          });
        }
      }
    } else {
      setDetectionStatus('Show your hands to the camera');
    }

    canvasCtx.restore();
  }, [onSignDetected]);

  // Draw hand landmarks on canvas
  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: HandLandmark[]) => {
    // Draw connections between landmarks
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
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
      ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
      ctx.stroke();
    });

    // Draw landmark points
    ctx.fillStyle = '#ff0000';
    landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * ctx.canvas.width,
        landmark.y * ctx.canvas.height,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  };

  // Simple gesture analysis - can be enhanced with ML models
  const analyzeGesture = (landmarks: HandLandmark[]): string | null => {
    if (!landmarks || landmarks.length !== 21) return null;

    // Simple gesture recognition based on finger positions
    const fingerTips = [4, 8, 12, 16, 20]; // Thumb, index, middle, ring, pinky tips
    const fingerPips = [3, 6, 10, 14, 18]; // PIP joints
    
    const fingersUp = fingerTips.map((tip, index) => {
      const pip = fingerPips[index];
      return landmarks[tip].y < landmarks[pip].y;
    });

    // Basic gesture patterns
    if (fingersUp.every(up => up)) return 'help'; // All fingers up
    if (fingersUp.every(up => !up)) return 'emergency'; // Fist
    if (fingersUp[1] && !fingersUp[2] && !fingersUp[3] && !fingersUp[4]) return 'yes'; // Point up
    if (!fingersUp[1] && !fingersUp[2] && !fingersUp[3] && !fingersUp[4] && fingersUp[0]) return 'no'; // Thumbs up
    if (fingersUp[1] && fingersUp[2] && !fingersUp[3] && !fingersUp[4]) return 'pain'; // Two fingers
    if (fingersUp[0] && fingersUp[1] && fingersUp[2] && !fingersUp[3] && !fingersUp[4]) return 'water'; // Three fingers
    if (fingersUp[0] && !fingersUp[1] && !fingersUp[2] && !fingersUp[3] && fingersUp[4]) return 'medicine'; // Thumb and pinky
    
    return null;
  };

  // Calculate confidence based on hand stability and clarity
  const calculateGestureConfidence = (landmarks: HandLandmark[]): number => {
    if (!landmarks || landmarks.length !== 21) return 0;

    // Simple confidence based on landmark positions
    let totalDistance = 0;
    let validLandmarks = 0;

    for (let i = 1; i < landmarks.length; i++) {
      const prev = landmarks[i - 1];
      const curr = landmarks[i];
      
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + 
        Math.pow(curr.y - prev.y, 2)
      );
      
      totalDistance += distance;
      validLandmarks++;
    }

    // Normalize confidence (inverse of average distance)
    const avgDistance = totalDistance / validLandmarks;
    return Math.max(0, Math.min(1, 1 - avgDistance * 10));
  };

  if (!isActive) {
    return (
      <div className="sign-language-detector disabled">
        <div className="status">Sign language detection is disabled</div>
      </div>
    );
  }

  return (
    <div className="sign-language-detector">
      <div className="video-container">
        <video
          ref={videoRef}
          className="input-video"
          style={{ display: 'none' }}
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="output-canvas"
          width={640}
          height={480}
          style={{
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
      
      <div className="detection-info">
        <div className="status">{detectionStatus}</div>
        
        {isInitialized && (
          <div className="gesture-guide">
            <h4>Medical Gestures:</h4>
            <div className="gesture-list">
              {Object.entries(medicalGestures).map(([key, gesture]) => (
                <div key={key} className={`gesture-item priority-${gesture.priority}`}>
                  <strong>{gesture.name}</strong>
                  <span className="priority">({gesture.priority})</span>
                </div>
              ))}
            </div>
          </div>
        )}      </div>
    </div>
  );
};

export default SignLanguageDetector;
