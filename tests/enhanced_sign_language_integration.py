#!/usr/bin/env python3
"""
Enhanced Sign Language Integration Test
This script integrates the newly trained medical gesture model
with the existing LifeBridge sign language detection system.
"""

import cv2
import numpy as np
import mediapipe as mp
import json
import time
import joblib
import boto3
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

@dataclass
class MedicalGestureResult:
    gesture: str
    confidence: float
    urgency_score: int
    medical_priority: str
    description: str
    landmarks: List[List[float]]
    timestamp: float

class EnhancedSignLanguageDetector:
    def __init__(self, model_path: Optional[str] = None):
        """Initialize enhanced detector with medical gesture recognition"""
        
        # MediaPipe setup
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # Load medical gesture model if available
        self.medical_model = None
        self.model_scaler = None
        self.gesture_definitions = {}
        
        if model_path:
            try:
                self.load_medical_model(model_path)
                print(f"✅ Loaded medical gesture model from {model_path}")
            except Exception as e:
                print(f"⚠️ Could not load medical model: {e}")
        
        # Initialize tracking
        self.gesture_history = []
        self.current_gesture = None
        self.gesture_confidence = 0.0
        self.last_detection_time = 0
        
        # Performance tracking
        self.frame_count = 0
        self.start_time = time.time()
        self.processing_times = []
        
    def load_medical_model(self, model_path: str):
        """Load the trained medical gesture recognition model"""
        try:
            if model_path.startswith('s3://'):
                # Load from S3
                s3 = boto3.client('s3')
                bucket, key = model_path.replace('s3://', '').split('/', 1)
                s3.download_file(bucket, key, 'temp_model.joblib')
                model_artifacts = joblib.load('temp_model.joblib')
                import os
                os.remove('temp_model.joblib')
            else:
                # Load from local file
                model_artifacts = joblib.load(model_path)
            
            self.medical_model = model_artifacts['model']
            self.model_scaler = model_artifacts['scaler']
            self.gesture_definitions = model_artifacts['gesture_definitions']
            
            print(f"📊 Model loaded with {len(self.gesture_definitions)} medical gestures")
            for gesture, info in self.gesture_definitions.items():
                print(f"   {gesture}: {info['description']} (urgency: {info['urgency_score']})")
                
        except Exception as e:
            raise Exception(f"Failed to load medical model: {e}")
    
    def extract_hand_features(self, landmarks) -> np.ndarray:
        """Extract features from MediaPipe hand landmarks for medical model"""
        if landmarks is None:
            return np.zeros(67)  # Expected feature size
        
        features = []
        landmark_list = landmarks.landmark
        
        # Extract basic landmark coordinates
        for landmark in landmark_list:
            features.extend([landmark.x, landmark.y, landmark.z])
        
        # Calculate derived features
        if len(landmark_list) >= 21:
            # Hand openness (distance between fingertips)
            fingertips = [4, 8, 12, 16, 20]  # Thumb, index, middle, ring, pinky tips
            wrist = landmark_list[0]
            
            fingertip_distances = []
            for tip_idx in fingertips:
                tip = landmark_list[tip_idx]
                distance = np.sqrt(
                    (tip.x - wrist.x)**2 + 
                    (tip.y - wrist.y)**2 + 
                    (tip.z - wrist.z)**2
                )
                fingertip_distances.append(distance)
            
            hand_openness = np.mean(fingertip_distances)
            hand_stability = 1.0 - np.std(fingertip_distances)  # More stable = less variation
            
            features.extend([hand_openness, hand_stability])
        else:
            features.extend([0.0, 0.0])
        
        # Add gesture complexity (placeholder)
        features.extend([len(landmark_list) / 21.0, 0.0])
        
        # Ensure we have exactly 67 features
        feature_array = np.array(features)
        if len(feature_array) > 67:
            feature_array = feature_array[:67]
        elif len(feature_array) < 67:
            padding = np.zeros(67 - len(feature_array))
            feature_array = np.concatenate([feature_array, padding])
        
        return feature_array
    
    def predict_medical_gesture(self, landmarks) -> Optional[MedicalGestureResult]:
        """Predict medical gesture using trained model"""
        if self.medical_model is None or landmarks is None:
            return None
        
        try:
            # Extract features
            features = self.extract_hand_features(landmarks)
            
            # Scale features
            features_scaled = self.model_scaler.transform([features])
            
            # Predict
            prediction = self.medical_model.predict(features_scaled)[0]
            confidence_scores = self.medical_model.predict_proba(features_scaled)[0]
            max_confidence = np.max(confidence_scores)
            
            # Only return results above confidence threshold
            if max_confidence < 0.7:  # Adjust threshold as needed
                return None
            
            # Get gesture info
            gesture_info = self.gesture_definitions.get(prediction, {})
            
            # Convert landmarks to list format
            landmark_coords = []
            for landmark in landmarks.landmark:
                landmark_coords.append([landmark.x, landmark.y, landmark.z])
            
            return MedicalGestureResult(
                gesture=prediction,
                confidence=float(max_confidence),
                urgency_score=gesture_info.get('urgency_score', 0),
                medical_priority=gesture_info.get('priority', 'unknown'),
                description=gesture_info.get('description', ''),
                landmarks=landmark_coords,
                timestamp=time.time()
            )
            
        except Exception as e:
            print(f"❌ Error in medical gesture prediction: {e}")
            return None
    
    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Process a single frame for sign language detection"""
        start_time = time.perf_counter()
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = self.hands.process(rgb_frame)
        
        # Initialize result info
        detection_info = {
            'hands_detected': 0,
            'medical_gestures': [],
            'landmarks': [],
            'confidence': 0.0,
            'processing_time_ms': 0.0
        }
        
        if results.multi_hand_landmarks:
            detection_info['hands_detected'] = len(results.multi_hand_landmarks)
            
            for hand_landmarks in results.multi_hand_landmarks:
                # Draw hand landmarks
                self.mp_drawing.draw_landmarks(
                    frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style()
                )
                
                # Store landmarks
                landmark_coords = []
                for landmark in hand_landmarks.landmark:
                    landmark_coords.append([landmark.x, landmark.y, landmark.z])
                detection_info['landmarks'].append(landmark_coords)
                
                # Predict medical gesture
                medical_result = self.predict_medical_gesture(hand_landmarks)
                if medical_result:
                    detection_info['medical_gestures'].append({
                        'gesture': medical_result.gesture,
                        'confidence': medical_result.confidence,
                        'urgency_score': medical_result.urgency_score,
                        'priority': medical_result.medical_priority,
                        'description': medical_result.description
                    })
                    
                    # Update tracking
                    self.current_gesture = medical_result.gesture
                    self.gesture_confidence = medical_result.confidence
                    self.last_detection_time = time.time()
                    
                    # Add to history
                    self.gesture_history.append(medical_result)
                    if len(self.gesture_history) > 10:  # Keep last 10 detections
                        self.gesture_history.pop(0)
        
        # Calculate processing time
        processing_time = (time.perf_counter() - start_time) * 1000
        detection_info['processing_time_ms'] = processing_time
        self.processing_times.append(processing_time)
        
        # Add overlay information
        self.add_info_overlay(frame, detection_info)
        
        self.frame_count += 1
        return frame, detection_info
    
    def add_info_overlay(self, frame: np.ndarray, detection_info: Dict[str, Any]):
        """Add information overlay to the frame"""
        height, width = frame.shape[:2]
        
        # Background for overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (400, 150), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Title
        cv2.putText(frame, "LifeBridge Enhanced Sign Language", (20, 35), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        # Detection info
        y_offset = 60
        cv2.putText(frame, f"Hands: {detection_info['hands_detected']}", 
                   (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Medical gestures
        for i, gesture in enumerate(detection_info['medical_gestures']):
            y_offset += 20
            priority_color = self.get_priority_color(gesture['priority'])
            text = f"{gesture['gesture']}: {gesture['confidence']:.2f} ({gesture['priority']})"
            cv2.putText(frame, text, (20, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, priority_color, 1)
        
        # Performance info
        if self.processing_times:
            avg_time = np.mean(self.processing_times[-30:])  # Last 30 frames
            fps = 1000 / avg_time if avg_time > 0 else 0
            cv2.putText(frame, f"FPS: {fps:.1f}", (20, height - 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            cv2.putText(frame, f"Process: {avg_time:.1f}ms", (20, height - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    
    def get_priority_color(self, priority: str) -> Tuple[int, int, int]:
        """Get color for medical priority level"""
        colors = {
            'critical': (0, 0, 255),    # Red
            'high': (0, 165, 255),      # Orange
            'medium': (0, 255, 255),    # Yellow
            'low': (0, 255, 0),         # Green
            'unknown': (128, 128, 128)  # Gray
        }
        return colors.get(priority, (128, 128, 128))
    
    def run_integration_test(self, duration_seconds: int = 60):
        """Run comprehensive integration test"""
        print("🚀 Starting Enhanced Sign Language Integration Test")
        print("=" * 60)
        print(f"Duration: {duration_seconds} seconds")
        print("Medical gestures available:")
        
        if self.gesture_definitions:
            for gesture, info in self.gesture_definitions.items():
                print(f"  {gesture}: {info['description']} (urgency: {info['urgency_score']})")
        else:
            print("  No medical model loaded - using basic detection only")
        
        print("\n🎥 Starting webcam capture...")
        print("Show medical sign language gestures to test recognition")
        print("Press 'q' to quit, 's' to save detection, 'm' for model info")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("❌ Cannot open webcam")
            return
        
        start_time = time.time()
        saved_detections = []
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame
                processed_frame, detection_info = self.process_frame(frame)
                
                # Show frame
                cv2.imshow('LifeBridge Enhanced Sign Language', processed_frame)
                
                # Check for key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s') and detection_info['medical_gestures']:
                    saved_detections.append({
                        'timestamp': time.time(),
                        'detections': detection_info['medical_gestures'],
                        'landmarks': detection_info['landmarks']
                    })
                    print(f"💾 Saved detection: {detection_info['medical_gestures'][0]['gesture']}")
                elif key == ord('m'):
                    self.print_model_info()
                
                # Check duration
                if time.time() - start_time > duration_seconds:
                    break
                    
        except KeyboardInterrupt:
            print("\n⏹️ Test interrupted by user")
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            
            # Generate test report
            self.generate_test_report(saved_detections, duration_seconds)
    
    def print_model_info(self):
        """Print current model information"""
        print("\n📊 Medical Gesture Model Information:")
        if self.medical_model is None:
            print("❌ No medical model loaded")
        else:
            print(f"✅ Model loaded with {len(self.gesture_definitions)} gestures")
            print("Recent detections:")
            for i, detection in enumerate(self.gesture_history[-5:]):
                print(f"  {i+1}. {detection.gesture} ({detection.confidence:.2f})")
    
    def generate_test_report(self, saved_detections: List[Dict], duration: int):
        """Generate comprehensive test report"""
        total_time = time.time() - self.start_time
        
        print("\n" + "=" * 60)
        print("📊 ENHANCED SIGN LANGUAGE INTEGRATION TEST REPORT")
        print("=" * 60)
        
        # Performance metrics
        print(f"Test duration: {total_time:.1f} seconds")
        print(f"Frames processed: {self.frame_count}")
        print(f"Average FPS: {self.frame_count / total_time:.1f}")
        
        if self.processing_times:
            avg_time = np.mean(self.processing_times)
            print(f"Average processing time: {avg_time:.1f}ms")
            print(f"Min processing time: {np.min(self.processing_times):.1f}ms")
            print(f"Max processing time: {np.max(self.processing_times):.1f}ms")
        
        # Detection statistics
        print(f"\nDetection Statistics:")
        print(f"Total gesture detections: {len(self.gesture_history)}")
        print(f"Saved detections: {len(saved_detections)}")
        
        if self.gesture_history:
            gesture_counts = {}
            priority_counts = {}
            
            for detection in self.gesture_history:
                gesture_counts[detection.gesture] = gesture_counts.get(detection.gesture, 0) + 1
                priority_counts[detection.medical_priority] = priority_counts.get(detection.medical_priority, 0) + 1
            
            print("\nGesture breakdown:")
            for gesture, count in sorted(gesture_counts.items(), key=lambda x: x[1], reverse=True):
                urgency = self.gesture_definitions.get(gesture, {}).get('urgency_score', 0)
                print(f"  {gesture}: {count} detections (urgency: {urgency})")
            
            print("\nMedical priority breakdown:")
            for priority, count in sorted(priority_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {priority}: {count} detections")
        
        # Save detailed results
        test_results = {
            'test_info': {
                'duration_seconds': total_time,
                'frames_processed': self.frame_count,
                'average_fps': self.frame_count / total_time,
                'model_loaded': self.medical_model is not None
            },
            'performance': {
                'avg_processing_time_ms': np.mean(self.processing_times) if self.processing_times else 0,
                'min_processing_time_ms': np.min(self.processing_times) if self.processing_times else 0,
                'max_processing_time_ms': np.max(self.processing_times) if self.processing_times else 0
            },
            'detections': saved_detections,
            'gesture_history': [
                {
                    'gesture': d.gesture,
                    'confidence': d.confidence,
                    'urgency_score': d.urgency_score,
                    'timestamp': d.timestamp
                } for d in self.gesture_history
            ]
        }
        
        # Save results to file
        results_file = f'enhanced_sign_language_test_results_{int(time.time())}.json'
        with open(results_file, 'w') as f:
            json.dump(test_results, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: {results_file}")
        print("✅ Integration test completed successfully!")

def main():
    """Main integration test"""
    print("🚀 LifeBridge Enhanced Sign Language Integration")
    print("=" * 60)
    
    # Try to load the medical model
    model_path = None
    try:
        with open('sagemaker_setup_info.json', 'r') as f:
            setup_info = json.load(f)
        model_path = f"s3://{setup_info['s3_bucket']}/models/medical_gesture_model.joblib"
        print(f"📦 Found S3 model path: {model_path}")
    except FileNotFoundError:
        print("⚠️ No S3 setup found, checking for local model...")
        if os.path.exists('medical_gesture_model.joblib'):
            model_path = 'medical_gesture_model.joblib'
            print(f"📦 Found local model: {model_path}")
    
    # Initialize detector
    detector = EnhancedSignLanguageDetector(model_path)
    
    # Run integration test
    detector.run_integration_test(duration_seconds=60)

if __name__ == "__main__":
    import os
    main()
