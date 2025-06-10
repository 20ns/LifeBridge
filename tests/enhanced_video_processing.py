#!/usr/bin/env python3
"""
Video Processing Enhancement for LifeBridge Sign Language
This script implements advanced video processing techniques for better sign language recognition
while staying within AWS free tier constraints.
"""

import cv2
import numpy as np
import json
import time
from typing import List, Dict, Tuple, Optional
import mediapipe as mp

class VideoProcessor:
    def __init__(self):
        """Initialize video processor with optimized settings"""
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        
        # Enhanced MediaPipe configuration for medical use
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.8,  # Higher confidence for medical accuracy
            min_tracking_confidence=0.7,   # Better tracking for stability
            model_complexity=1             # Balance between accuracy and performance
        )
        
        # Video processing parameters
        self.frame_buffer = []
        self.buffer_size = 10  # Keep last 10 frames
        self.gesture_history = []
        self.stabilization_frames = 5
        
        # Performance metrics
        self.processing_times = []
        self.detection_count = 0
        self.start_time = time.time()
    
    def preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for better hand detection"""
        # Convert to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Enhance contrast and brightness for better detection
        enhanced = self.enhance_contrast(rgb_frame)
        
        # Apply noise reduction
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        return denoised
    
    def enhance_contrast(self, frame: np.ndarray) -> np.ndarray:
        """Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)"""
        # Convert to LAB color space
        lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)
        
        # Merge channels back
        enhanced_lab = cv2.merge([l_enhanced, a, b])
        enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
        
        return enhanced_rgb
    
    def temporal_smoothing(self, landmarks: List) -> List:
        """Apply temporal smoothing to reduce jitter in hand landmarks"""
        if len(self.frame_buffer) < 3:
            return landmarks
        
        # Average landmarks over last few frames
        smoothed_landmarks = []
        
        for i in range(len(landmarks)):
            x_coords = [frame[i].x for frame in self.frame_buffer[-3:] if len(frame) > i]
            y_coords = [frame[i].y for frame in self.frame_buffer[-3:] if len(frame) > i]
            z_coords = [frame[i].z for frame in self.frame_buffer[-3:] if len(frame) > i]
            
            if x_coords and y_coords and z_coords:
                avg_x = np.median(x_coords)  # Use median for robustness
                avg_y = np.median(y_coords)
                avg_z = np.median(z_coords)
                
                # Create smoothed landmark
                smoothed_landmark = type(landmarks[i])()
                smoothed_landmark.x = avg_x
                smoothed_landmark.y = avg_y
                smoothed_landmark.z = avg_z
                smoothed_landmarks.append(smoothed_landmark)
            else:
                smoothed_landmarks.append(landmarks[i])
        
        return smoothed_landmarks
    
    def detect_motion_blur(self, frame: np.ndarray) -> float:
        """Detect motion blur in frame using Laplacian variance"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return laplacian_var
    
    def quality_assessment(self, frame: np.ndarray) -> Dict[str, float]:
        """Assess frame quality for sign language detection"""
        # Check motion blur
        blur_score = self.detect_motion_blur(frame)
        
        # Check brightness
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        
        # Check contrast
        contrast = np.std(gray)
        
        # Overall quality score
        quality_score = min(1.0, (blur_score / 100) * (contrast / 50) * (1 - abs(brightness - 127) / 127))
        
        return {
            'blur_score': blur_score,
            'brightness': brightness,
            'contrast': contrast,
            'overall_quality': quality_score
        }
    
    def process_video_stream(self, source=0, duration=30):
        """Process video stream with enhanced detection"""
        print(f"🎥 Starting enhanced video processing for {duration} seconds...")
        print("👋 Show medical sign language gestures")
        print("Press 'q' to quit early, 's' to save sample")
        
        cap = cv2.VideoCapture(source)
        
        # Set camera properties for better quality
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        detection_results = []
        frame_count = 0
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                process_start = time.time()
                
                # Assess frame quality
                quality = self.quality_assessment(frame)
                
                # Only process high-quality frames for efficiency
                if quality['overall_quality'] > 0.3:
                    # Preprocess frame
                    processed_frame = self.preprocess_frame(frame)
                    
                    # Detect hands
                    results = self.hands.process(processed_frame)
                    
                    if results.multi_hand_landmarks:
                        for hand_landmarks in results.multi_hand_landmarks:
                            # Apply temporal smoothing
                            smoothed_landmarks = self.temporal_smoothing(hand_landmarks.landmark)
                            
                            # Store in buffer
                            self.frame_buffer.append(smoothed_landmarks)
                            if len(self.frame_buffer) > self.buffer_size:
                                self.frame_buffer.pop(0)
                            
                            # Analyze gesture
                            gesture_info = self.analyze_enhanced_gesture(smoothed_landmarks, quality)
                            
                            if gesture_info:
                                detection_results.append({
                                    'timestamp': time.time(),
                                    'frame_number': frame_count,
                                    'gesture_info': gesture_info,
                                    'quality_metrics': quality
                                })
                                
                                self.detection_count += 1
                                
                                # Draw enhanced visualization
                                self.draw_enhanced_landmarks(frame, hand_landmarks, gesture_info)
                
                # Calculate processing time
                process_time = (time.time() - process_start) * 1000
                self.processing_times.append(process_time)
                
                # Display frame with info
                self.draw_performance_info(frame, process_time, quality)
                cv2.imshow('Enhanced Sign Language Detection', frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s') and detection_results:
                    self.save_detection_sample(detection_results[-1])
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            
            # Save results and generate report
            self.save_processing_results(detection_results)
            self.generate_performance_report()
    
    def analyze_enhanced_gesture(self, landmarks: List, quality: Dict) -> Optional[Dict]:
        """Enhanced gesture analysis with quality consideration"""
        if not landmarks or len(landmarks) != 21:
            return None
        
        # Basic gesture recognition (can be enhanced with ML models)
        gesture = self.classify_gesture(landmarks)
        if not gesture:
            return None
        
        # Calculate confidence with quality weighting
        base_confidence = self.calculate_gesture_confidence(landmarks)
        quality_weighted_confidence = base_confidence * quality['overall_quality']
        
        # Medical priority assessment
        medical_priority = self.assess_medical_priority(gesture, quality_weighted_confidence)
        
        return {
            'gesture': gesture,
            'confidence': quality_weighted_confidence,
            'medical_priority': medical_priority,
            'quality_metrics': quality,
            'landmark_stability': self.calculate_stability(landmarks)
        }
    
    def classify_gesture(self, landmarks: List) -> Optional[str]:
        """Classify gesture based on hand landmarks"""
        # Simplified gesture classification
        finger_states = self.get_finger_states(landmarks)
        
        # Emergency: closed fist
        if not any(finger_states):
            return 'emergency'
        
        # Help: all fingers up
        elif all(finger_states):
            return 'help'
        
        # Pain: index and middle finger up
        elif finger_states[1] and finger_states[2] and not finger_states[3] and not finger_states[4]:
            return 'pain'
        
        # Medicine: thumb and pinky up
        elif finger_states[0] and not finger_states[1] and not finger_states[2] and not finger_states[3] and finger_states[4]:
            return 'medicine'
        
        return None
    
    def get_finger_states(self, landmarks: List) -> List[bool]:
        """Get finger states (up/down) from landmarks"""
        finger_tips = [4, 8, 12, 16, 20]
        finger_pips = [3, 6, 10, 14, 18]
        
        states = []
        
        # Thumb (special case)
        if landmarks[4].x > landmarks[3].x:
            states.append(True)
        else:
            states.append(False)
        
        # Other fingers
        for i in range(1, 5):
            if landmarks[finger_tips[i]].y < landmarks[finger_pips[i]].y:
                states.append(True)
            else:
                states.append(False)
        
        return states
    
    def calculate_gesture_confidence(self, landmarks: List) -> float:
        """Calculate gesture confidence score"""
        # Stability assessment
        stability = self.calculate_stability(landmarks)
        
        # Anatomical correctness
        anatomy_score = self.check_anatomy(landmarks)
        
        # Combine factors
        confidence = (stability * 0.6 + anatomy_score * 0.4)
        return min(1.0, max(0.0, confidence))
    
    def calculate_stability(self, landmarks: List) -> float:
        """Calculate landmark stability"""
        if len(self.frame_buffer) < 3:
            return 0.5
        
        # Compare with previous frames
        stability_scores = []
        
        for i in range(len(landmarks)):
            if i < len(self.frame_buffer[-2]) and i < len(self.frame_buffer[-3]):
                prev1 = self.frame_buffer[-2][i]
                prev2 = self.frame_buffer[-3][i]
                curr = landmarks[i]
                
                # Calculate movement variance
                dx1 = abs(curr.x - prev1.x)
                dy1 = abs(curr.y - prev1.y)
                dx2 = abs(prev1.x - prev2.x)
                dy2 = abs(prev1.y - prev2.y)
                
                # Low variance indicates stability
                variance = (dx1 + dy1 + dx2 + dy2) / 4
                stability = max(0, 1 - variance * 10)
                stability_scores.append(stability)
        
        return np.mean(stability_scores) if stability_scores else 0.5
    
    def check_anatomy(self, landmarks: List) -> float:
        """Check anatomical correctness of hand pose"""
        # Simplified anatomical checks
        score = 0.0
        checks = 0
        
        # Check finger joint relationships
        finger_chains = [
            [0, 1, 2, 3, 4],    # Thumb
            [0, 5, 6, 7, 8],    # Index
            [0, 9, 10, 11, 12], # Middle
            [0, 13, 14, 15, 16], # Ring
            [0, 17, 18, 19, 20]  # Pinky
        ]
        
        for chain in finger_chains:
            for i in range(len(chain) - 1):
                p1 = landmarks[chain[i]]
                p2 = landmarks[chain[i + 1]]
                
                distance = np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)
                
                # Reasonable joint distances
                if 0.02 < distance < 0.15:
                    score += 1
                checks += 1
        
        return score / checks if checks > 0 else 0.0
    
    def assess_medical_priority(self, gesture: str, confidence: float) -> str:
        """Assess medical priority of detected gesture"""
        priority_map = {
            'emergency': 'critical',
            'help': 'critical',
            'pain': 'high',
            'medicine': 'high',
            'water': 'medium',
            'yes': 'low',
            'no': 'low'
        }
        
        base_priority = priority_map.get(gesture, 'low')
        
        # Adjust based on confidence
        if confidence < 0.5:
            return 'low'
        elif confidence > 0.9 and base_priority == 'critical':
            return 'critical'
        
        return base_priority
    
    def draw_enhanced_landmarks(self, frame: np.ndarray, landmarks, gesture_info: Dict):
        """Draw enhanced landmark visualization"""
        # Draw standard landmarks
        self.mp_draw.draw_landmarks(
            frame, landmarks, self.mp_hands.HAND_CONNECTIONS
        )
        
        # Draw gesture information
        priority_colors = {
            'critical': (0, 0, 255),    # Red
            'high': (0, 165, 255),      # Orange
            'medium': (0, 255, 255),    # Yellow
            'low': (0, 255, 0)          # Green
        }
        
        color = priority_colors.get(gesture_info['medical_priority'], (255, 255, 255))
        
        # Background rectangle
        cv2.rectangle(frame, (10, 10), (450, 120), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (450, 120), color, 2)
        
        # Text information
        cv2.putText(frame, f"Gesture: {gesture_info['gesture'].upper()}", 
                   (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.putText(frame, f"Confidence: {gesture_info['confidence']:.3f}", 
                   (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(frame, f"Priority: {gesture_info['medical_priority'].upper()}", 
                   (20, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(frame, f"Stability: {gesture_info['landmark_stability']:.3f}", 
                   (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    
    def draw_performance_info(self, frame: np.ndarray, process_time: float, quality: Dict):
        """Draw performance and quality information"""
        # Performance info in top right
        height, width = frame.shape[:2]
        
        cv2.rectangle(frame, (width-300, 10), (width-10, 100), (0, 0, 0), -1)
        cv2.rectangle(frame, (width-300, 10), (width-10, 100), (255, 255, 255), 1)
        
        cv2.putText(frame, f"Process: {process_time:.1f}ms", 
                   (width-290, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Quality: {quality['overall_quality']:.3f}", 
                   (width-290, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Brightness: {quality['brightness']:.0f}", 
                   (width-290, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Contrast: {quality['contrast']:.0f}", 
                   (width-290, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def save_detection_sample(self, sample: Dict):
        """Save detection sample for analysis"""
        timestamp = int(time.time())
        filename = f"detection_sample_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(sample, f, indent=2, default=str)
        
        print(f"💾 Saved detection sample: {filename}")
    
    def save_processing_results(self, results: List[Dict]):
        """Save complete processing results"""
        if not results:
            print("📊 No detection results to save")
            return
        
        output = {
            'session_info': {
                'total_detections': len(results),
                'session_duration': time.time() - self.start_time,
                'avg_processing_time': np.mean(self.processing_times),
                'detection_rate': self.detection_count / (time.time() - self.start_time)
            },
            'detections': results
        }
        
        filename = f"enhanced_processing_results_{int(time.time())}.json"
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2, default=str)
        
        print(f"📊 Saved processing results: {filename}")
    
    def generate_performance_report(self):
        """Generate performance analysis report"""
        if not self.processing_times:
            print("❌ No performance data to analyze")
            return
        
        avg_time = np.mean(self.processing_times)
        max_time = np.max(self.processing_times)
        min_time = np.min(self.processing_times)
        
        total_time = time.time() - self.start_time
        fps = len(self.processing_times) / total_time
        
        print("\n" + "="*50)
        print("📊 ENHANCED PROCESSING PERFORMANCE REPORT")
        print("="*50)
        print(f"Total processing time: {total_time:.2f} seconds")
        print(f"Frames processed: {len(self.processing_times)}")
        print(f"Average FPS: {fps:.2f}")
        print(f"Average processing time: {avg_time:.2f}ms")
        print(f"Min processing time: {min_time:.2f}ms")
        print(f"Max processing time: {max_time:.2f}ms")
        print(f"Total detections: {self.detection_count}")
        print(f"Detection rate: {self.detection_count/total_time:.2f} detections/second")
        
        # Performance assessment
        if avg_time < 50:  # Under 50ms average
            print("✅ Excellent performance - suitable for real-time use")
        elif avg_time < 100:
            print("⚠️ Good performance - may need optimization for real-time")
        else:
            print("❌ Performance needs improvement for real-time use")

def main():
    """Main execution function"""
    processor = VideoProcessor()
    
    print("🚀 Enhanced Video Processing for LifeBridge Sign Language")
    print("=" * 60)
    print("This will test enhanced video processing capabilities")
    print("including contrast enhancement, temporal smoothing, and quality assessment")
    
    # Test with webcam for 30 seconds
    processor.process_video_stream(source=0, duration=30)

if __name__ == "__main__":
    main()
