#!/usr/bin/env python3
"""
Enhanced Hand Detection Test for LifeBridge Sign Language
This script tests and improves the current MediaPipe hand detection
with better accuracy and medical context awareness.
"""

import cv2
import mediapipe as mp
import numpy as np
import json
import time
from typing import List, Dict, Tuple, Optional
import argparse

class EnhancedHandDetector:
    def __init__(self):
        # Initialize MediaPipe
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        self.mp_draw_styles = mp.solutions.drawing_styles
        
        # Configure hands detection with medical-optimized settings
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,  # Higher confidence for medical use
            min_tracking_confidence=0.6,   # Better tracking stability
            model_complexity=1             # Balanced accuracy/speed
        )
        
        # Medical gesture definitions
        self.medical_gestures = {
            'emergency': {
                'description': 'Closed fist held steady',
                'priority': 'critical',
                'confidence_threshold': 0.8
            },
            'help': {
                'description': 'Open hand, all fingers extended',
                'priority': 'critical',
                'confidence_threshold': 0.75
            },
            'pain': {
                'description': 'Two fingers pointing (index + middle)',
                'priority': 'high',
                'confidence_threshold': 0.7
            },
            'medicine': {
                'description': 'Thumb and pinky extended',
                'priority': 'high',
                'confidence_threshold': 0.7
            },
            'water': {
                'description': 'Three fingers (thumb + index + middle)',
                'priority': 'medium',
                'confidence_threshold': 0.65
            },
            'yes': {
                'description': 'Thumbs up',
                'priority': 'low',
                'confidence_threshold': 0.6
            },
            'no': {
                'description': 'Point downward',
                'priority': 'low',
                'confidence_threshold': 0.6
            }
        }
        
        # Gesture stability tracking
        self.gesture_history = []
        self.stability_buffer_size = 5
        self.gesture_confidence_history = {}
        
    def calculate_finger_states(self, landmarks) -> List[bool]:
        """Calculate which fingers are extended based on landmarks"""
        finger_tips = [4, 8, 12, 16, 20]  # Thumb, index, middle, ring, pinky
        finger_pips = [3, 6, 10, 14, 18]  # PIP joints
        
        fingers_up = []
        
        # Thumb (different logic due to orientation)
        if landmarks[finger_tips[0]].x > landmarks[finger_pips[0]].x:
            fingers_up.append(True)
        else:
            fingers_up.append(False)
        
        # Other fingers
        for i in range(1, 5):
            if landmarks[finger_tips[i]].y < landmarks[finger_pips[i]].y:
                fingers_up.append(True)
            else:
                fingers_up.append(False)
        
        return fingers_up
    
    def analyze_medical_gesture(self, landmarks) -> Tuple[Optional[str], float]:
        """Analyze landmarks to identify medical gestures"""
        if not landmarks or len(landmarks) != 21:
            return None, 0.0
        
        fingers_up = self.calculate_finger_states(landmarks)
        confidence = self.calculate_gesture_confidence(landmarks)
        
        # Gesture recognition logic
        gesture = None
        
        # Emergency: Closed fist (no fingers up)
        if not any(fingers_up):
            gesture = 'emergency'
        
        # Help: All fingers up
        elif all(fingers_up):
            gesture = 'help'
        
        # Pain: Index and middle fingers up
        elif fingers_up[1] and fingers_up[2] and not fingers_up[3] and not fingers_up[4]:
            gesture = 'pain'
        
        # Medicine: Thumb and pinky up
        elif fingers_up[0] and not fingers_up[1] and not fingers_up[2] and not fingers_up[3] and fingers_up[4]:
            gesture = 'medicine'
        
        # Water: Thumb, index, and middle up
        elif fingers_up[0] and fingers_up[1] and fingers_up[2] and not fingers_up[3] and not fingers_up[4]:
            gesture = 'water'
        
        # Yes: Only thumb up
        elif fingers_up[0] and not any(fingers_up[1:]):
            gesture = 'yes'
        
        # No: Only index finger pointing down (inverted logic)
        elif not fingers_up[1] and fingers_up[2] and not fingers_up[3] and not fingers_up[4]:
            gesture = 'no'
        
        return gesture, confidence
    
    def calculate_gesture_confidence(self, landmarks) -> float:
        """Calculate confidence score based on hand stability and pose quality"""
        if not landmarks:
            return 0.0
        
        # Factor 1: Landmark visibility (all points should be visible)
        visibility_score = sum(1 for lm in landmarks if hasattr(lm, 'visibility') and lm.visibility > 0.5) / len(landmarks)
        
        # Factor 2: Hand stability (consistent z-depth)
        z_values = [lm.z for lm in landmarks]
        z_std = np.std(z_values)
        stability_score = max(0, 1 - (z_std * 10))  # Normalize std deviation
        
        # Factor 3: Anatomical correctness (finger joint relationships)
        anatomy_score = self.check_anatomical_correctness(landmarks)
        
        # Combine factors
        confidence = (visibility_score * 0.4 + stability_score * 0.3 + anatomy_score * 0.3)
        return min(1.0, max(0.0, confidence))
    
    def check_anatomical_correctness(self, landmarks) -> float:
        """Check if hand pose is anatomically correct"""
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
                
                # Calculate distance
                distance = np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)
                
                # Check if distance is reasonable (not too short or too long)
                if 0.02 < distance < 0.15:
                    score += 1
                checks += 1
        
        return score / checks if checks > 0 else 0.0
    
    def add_gesture_to_history(self, gesture: str, confidence: float):
        """Add gesture to stability tracking history"""
        timestamp = time.time()
        
        self.gesture_history.append({
            'gesture': gesture,
            'confidence': confidence,
            'timestamp': timestamp
        })
        
        # Keep only recent history
        cutoff_time = timestamp - 3.0  # 3 seconds
        self.gesture_history = [g for g in self.gesture_history if g['timestamp'] > cutoff_time]
        
        # Update confidence history
        if gesture not in self.gesture_confidence_history:
            self.gesture_confidence_history[gesture] = []
        
        self.gesture_confidence_history[gesture].append(confidence)
        if len(self.gesture_confidence_history[gesture]) > 10:
            self.gesture_confidence_history[gesture] = self.gesture_confidence_history[gesture][-10:]
    
    def get_stable_gesture(self) -> Tuple[Optional[str], float]:
        """Get the most stable gesture from recent history"""
        if len(self.gesture_history) < 3:
            return None, 0.0
        
        # Count gesture occurrences in recent history
        gesture_counts = {}
        total_confidence = {}
        
        for entry in self.gesture_history[-self.stability_buffer_size:]:
            gesture = entry['gesture']
            confidence = entry['confidence']
            
            if gesture not in gesture_counts:
                gesture_counts[gesture] = 0
                total_confidence[gesture] = 0
            
            gesture_counts[gesture] += 1
            total_confidence[gesture] += confidence
        
        # Find most frequent gesture with sufficient confidence
        best_gesture = None
        best_score = 0
        
        for gesture, count in gesture_counts.items():
            avg_confidence = total_confidence[gesture] / count
            
            # Require at least 60% of recent frames to agree
            if count >= len(self.gesture_history) * 0.6:
                threshold = self.medical_gestures[gesture]['confidence_threshold']
                
                if avg_confidence >= threshold:
                    score = count * avg_confidence
                    if score > best_score:
                        best_gesture = gesture
                        best_score = avg_confidence
        
        return best_gesture, best_score
    
    def process_frame(self, frame):
        """Process a single frame for hand detection and gesture recognition"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        
        gesture_info = None
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Draw landmarks
                self.mp_draw.draw_landmarks(
                    frame, 
                    hand_landmarks, 
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_draw_styles.get_default_hand_landmarks_style(),
                    self.mp_draw_styles.get_default_hand_connections_style()
                )
                
                # Analyze gesture
                gesture, confidence = self.analyze_medical_gesture(hand_landmarks.landmark)
                
                if gesture:
                    self.add_gesture_to_history(gesture, confidence)
                    stable_gesture, stable_confidence = self.get_stable_gesture()
                    
                    if stable_gesture:
                        gesture_info = {
                            'gesture': stable_gesture,
                            'confidence': stable_confidence,
                            'priority': self.medical_gestures[stable_gesture]['priority'],
                            'description': self.medical_gestures[stable_gesture]['description'],
                            'landmarks': [[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark]
                        }
                        
                        # Draw gesture info on frame
                        self.draw_gesture_info(frame, gesture_info)
        
        return frame, gesture_info
    
    def draw_gesture_info(self, frame, gesture_info):
        """Draw gesture information on the frame"""
        gesture = gesture_info['gesture']
        confidence = gesture_info['confidence']
        priority = gesture_info['priority']
        
        # Color based on priority
        color = {
            'critical': (0, 0, 255),    # Red
            'high': (0, 165, 255),      # Orange
            'medium': (0, 255, 255),    # Yellow
            'low': (0, 255, 0)          # Green
        }.get(priority, (255, 255, 255))
        
        # Draw background rectangle
        cv2.rectangle(frame, (10, 10), (400, 100), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (400, 100), color, 2)
        
        # Draw text
        cv2.putText(frame, f"Gesture: {gesture.upper()}", (20, 35), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.putText(frame, f"Confidence: {confidence:.2f}", (20, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(frame, f"Priority: {priority.upper()}", (20, 85), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    def run_webcam_test(self):
        """Run real-time webcam test"""
        print("🎥 Starting webcam test for enhanced hand detection...")
        print("👋 Show medical gestures to test recognition")
        print("Press 'q' to quit, 's' to save current gesture")
        
        cap = cv2.VideoCapture(0)
        gesture_log = []
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame
                processed_frame, gesture_info = self.process_frame(frame)
                
                # Show frame
                cv2.imshow('LifeBridge Enhanced Hand Detection', processed_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord('q'):
                    break
                elif key == ord('s') and gesture_info:
                    # Save current gesture
                    gesture_log.append({
                        'timestamp': time.time(),
                        'gesture_info': gesture_info
                    })
                    print(f"💾 Saved gesture: {gesture_info['gesture']}")
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            
            # Save gesture log
            if gesture_log:
                with open('gesture_test_log.json', 'w') as f:
                    json.dump(gesture_log, f, indent=2)
                print(f"📊 Saved {len(gesture_log)} gestures to gesture_test_log.json")
    
    def analyze_test_results(self):
        """Analyze test results and provide recommendations"""
        print("📊 Analyzing test results...")
        
        try:
            with open('gesture_test_log.json', 'r') as f:
                gesture_log = json.load(f)
            
            # Calculate statistics
            total_gestures = len(gesture_log)
            gesture_counts = {}
            confidence_stats = {}
            
            for entry in gesture_log:
                gesture = entry['gesture_info']['gesture']
                confidence = entry['gesture_info']['confidence']
                
                if gesture not in gesture_counts:
                    gesture_counts[gesture] = 0
                    confidence_stats[gesture] = []
                
                gesture_counts[gesture] += 1
                confidence_stats[gesture].append(confidence)
            
            # Print analysis
            print(f"\n📋 Test Results Summary:")
            print(f"Total gestures detected: {total_gestures}")
            print(f"Unique gestures: {len(gesture_counts)}")
            
            for gesture, count in gesture_counts.items():
                avg_confidence = np.mean(confidence_stats[gesture])
                min_confidence = np.min(confidence_stats[gesture])
                max_confidence = np.max(confidence_stats[gesture])
                
                print(f"\n{gesture.upper()}:")
                print(f"  Count: {count}")
                print(f"  Avg Confidence: {avg_confidence:.3f}")
                print(f"  Confidence Range: {min_confidence:.3f} - {max_confidence:.3f}")
                
                # Recommendations
                if avg_confidence < 0.7:
                    print(f"  ⚠️ Low confidence - consider improving detection")
                elif avg_confidence > 0.9:
                    print(f"  ✅ Excellent detection quality")
        
        except FileNotFoundError:
            print("❌ No test results found. Run webcam test first.")

def main():
    parser = argparse.ArgumentParser(description='Enhanced Hand Detection Test for LifeBridge')
    parser.add_argument('--mode', choices=['webcam', 'analyze'], default='webcam',
                       help='Test mode: webcam for live testing, analyze for result analysis')
    
    args = parser.parse_args()
    
    detector = EnhancedHandDetector()
    
    if args.mode == 'webcam':
        detector.run_webcam_test()
    elif args.mode == 'analyze':
        detector.analyze_test_results()

if __name__ == "__main__":
    main()
