#!/usr/bin/env python3
"""
Medical Sign Language Gesture Training Script
This script trains a lightweight model for medical sign language recognition
optimized for AWS Lambda deployment and free tier constraints.
"""

import os
import json
import numpy as np
import boto3
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler
import mediapipe as mp
import cv2
from typing import List, Tuple, Dict, Any

class MedicalGestureTrainer:
    def __init__(self, region='eu-north-1'):
        self.region = region
        self.s3 = boto3.client('s3', region_name=region)
        self.sagemaker = boto3.client('sagemaker', region_name=region)
        
        # Medical gesture definitions
        self.medical_gestures = {
            'emergency': {
                'priority': 'critical',
                'description': 'Emergency assistance needed',
                'hand_shape': 'flat_hand_raised'
            },
            'help': {
                'priority': 'critical', 
                'description': 'Request for help',
                'hand_shape': 'pointing_gesture'
            },
            'pain': {
                'priority': 'high',
                'description': 'Indicating pain or discomfort',
                'hand_shape': 'closed_fist'
            },
            'medicine': {
                'priority': 'medium',
                'description': 'Request for medication',
                'hand_shape': 'pinch_gesture'
            },
            'water': {
                'priority': 'medium',
                'description': 'Request for water',
                'hand_shape': 'cup_gesture'
            },
            'yes': {
                'priority': 'low',
                'description': 'Affirmative response',
                'hand_shape': 'thumbs_up'
            },
            'no': {
                'priority': 'low', 
                'description': 'Negative response',
                'hand_shape': 'thumbs_down'
            }
        }
        
        # Initialize MediaPipe
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
    def extract_hand_features(self, landmarks) -> np.ndarray:
        """Extract features from MediaPipe hand landmarks"""
        if landmarks is None:
            return np.zeros(84)  # 21 landmarks * 4 features each
        
        features = []
        for landmark in landmarks:
            # Position features
            features.extend([landmark.x, landmark.y, landmark.z])
            
            # Distance from wrist (landmark 0)
            wrist = landmarks[0]
            distance = np.sqrt(
                (landmark.x - wrist.x)**2 + 
                (landmark.y - wrist.y)**2 + 
                (landmark.z - wrist.z)**2
            )
            features.append(distance)
        
        return np.array(features)
    
    def create_synthetic_dataset(self, samples_per_gesture=100) -> Tuple[np.ndarray, np.ndarray]:
        """Create synthetic training data for medical gestures"""
        print("🏗️ Creating synthetic training dataset...")
        
        features = []
        labels = []
        
        for gesture_name, gesture_info in self.medical_gestures.items():
            print(f"   Generating {samples_per_gesture} samples for '{gesture_name}'")
            
            for _ in range(samples_per_gesture):
                # Generate synthetic hand landmarks based on gesture type
                synthetic_landmarks = self._generate_gesture_landmarks(gesture_name)
                feature_vector = self.extract_hand_features(synthetic_landmarks)
                
                features.append(feature_vector)
                labels.append(gesture_name)
        
        X = np.array(features)
        y = np.array(labels)
        
        print(f"✅ Dataset created: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    
    def _generate_gesture_landmarks(self, gesture_name: str):
        """Generate synthetic landmarks for a specific gesture"""
        # Base hand landmarks (normalized coordinates)
        base_landmarks = []
        
        if gesture_name == 'emergency':
            # Flat hand raised - fingers extended
            for i in range(21):
                if i in [4, 8, 12, 16, 20]:  # Fingertips
                    x = 0.5 + np.random.normal(0, 0.05)
                    y = 0.3 + np.random.normal(0, 0.05)
                    z = 0.0 + np.random.normal(0, 0.02)
                else:
                    x = 0.5 + np.random.normal(0, 0.1)
                    y = 0.5 + np.random.normal(0, 0.1)
                    z = 0.0 + np.random.normal(0, 0.02)
                
                # Create landmark-like object
                landmark = type('Landmark', (), {
                    'x': max(0, min(1, x)),
                    'y': max(0, min(1, y)), 
                    'z': z
                })()
                base_landmarks.append(landmark)
                
        elif gesture_name == 'help':
            # Pointing gesture - index finger extended
            for i in range(21):
                if i in [5, 6, 7, 8]:  # Index finger
                    x = 0.6 + np.random.normal(0, 0.03)
                    y = 0.4 + np.random.normal(0, 0.03)
                    z = 0.0 + np.random.normal(0, 0.02)
                else:
                    x = 0.5 + np.random.normal(0, 0.08)
                    y = 0.6 + np.random.normal(0, 0.08)
                    z = 0.0 + np.random.normal(0, 0.02)
                
                landmark = type('Landmark', (), {
                    'x': max(0, min(1, x)),
                    'y': max(0, min(1, y)),
                    'z': z
                })()
                base_landmarks.append(landmark)
                
        elif gesture_name == 'pain':
            # Closed fist - fingers curled
            for i in range(21):
                x = 0.5 + np.random.normal(0, 0.06)
                y = 0.5 + np.random.normal(0, 0.06)
                z = 0.0 + np.random.normal(0, 0.02)
                
                landmark = type('Landmark', (), {
                    'x': max(0, min(1, x)),
                    'y': max(0, min(1, y)),
                    'z': z
                })()
                base_landmarks.append(landmark)
                
        elif gesture_name == 'medicine':
            # Pinch gesture - thumb and index finger together
            for i in range(21):
                if i in [4, 8]:  # Thumb tip and index tip
                    x = 0.5 + np.random.normal(0, 0.02)
                    y = 0.4 + np.random.normal(0, 0.02)
                    z = 0.0 + np.random.normal(0, 0.01)
                else:
                    x = 0.5 + np.random.normal(0, 0.08)
                    y = 0.5 + np.random.normal(0, 0.08)
                    z = 0.0 + np.random.normal(0, 0.02)
                
                landmark = type('Landmark', (), {
                    'x': max(0, min(1, x)),
                    'y': max(0, min(1, y)),
                    'z': z
                })()
                base_landmarks.append(landmark)
                
        else:
            # Default gesture for water, yes, no
            for i in range(21):
                x = 0.5 + np.random.normal(0, 0.1)
                y = 0.5 + np.random.normal(0, 0.1)
                z = 0.0 + np.random.normal(0, 0.02)
                
                landmark = type('Landmark', (), {
                    'x': max(0, min(1, x)),
                    'y': max(0, min(1, y)),
                    'z': z
                })()
                base_landmarks.append(landmark)
        
        return base_landmarks
    
    def train_model(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Train lightweight model for gesture recognition"""
        print("🧠 Training medical gesture recognition model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Random Forest (lightweight for Lambda)
        model = RandomForestClassifier(
            n_estimators=50,  # Keep small for Lambda size limits
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Model trained with accuracy: {accuracy:.3f}")
        print("📊 Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Save model artifacts
        model_artifacts = {
            'model': model,
            'scaler': scaler,
            'accuracy': accuracy,
            'gesture_definitions': self.medical_gestures,
            'feature_names': [f'feature_{i}' for i in range(X.shape[1])]
        }
        
        return model_artifacts
    
    def save_model_to_s3(self, model_artifacts: Dict[str, Any], bucket_name: str) -> str:
        """Save trained model to S3 for Lambda deployment"""
        print("💾 Saving model to S3...")
        
        # Save locally first
        local_model_path = 'medical_gesture_model.joblib'
        joblib.dump(model_artifacts, local_model_path)
        
        # Upload to S3
        s3_key = 'models/medical_gesture_model.joblib'
        
        try:
            self.s3.upload_file(local_model_path, bucket_name, s3_key)
            s3_path = f's3://{bucket_name}/{s3_key}'
            print(f"✅ Model saved to: {s3_path}")
            
            # Clean up local file
            os.remove(local_model_path)
            
            return s3_path
            
        except Exception as e:
            print(f"❌ Failed to save model to S3: {e}")
            raise e
    
    def generate_deployment_package(self, model_artifacts: Dict[str, Any]) -> str:
        """Generate lightweight deployment package for Lambda"""
        print("📦 Generating Lambda deployment package...")
        
        # Create simplified model for Lambda deployment
        lambda_model = {
            'model_type': 'medical_gesture_classifier',
            'version': '1.0',
            'accuracy': model_artifacts['accuracy'],
            'gesture_definitions': self.medical_gestures,
            'model_params': {
                'feature_importance': model_artifacts['model'].feature_importances_.tolist(),
                'n_estimators': model_artifacts['model'].n_estimators,
                'max_depth': model_artifacts['model'].max_depth
            },
            'preprocessing': {
                'scaler_mean': model_artifacts['scaler'].mean_.tolist(),
                'scaler_scale': model_artifacts['scaler'].scale_.tolist()
            }
        }
        
        # Save deployment config
        deployment_config = {
            'model_info': lambda_model,
            'deployment_instructions': {
                'lambda_runtime': 'python3.9',
                'memory_mb': 256,
                'timeout_seconds': 30,
                'environment_variables': {
                    'MODEL_BUCKET': 'lifebridge-sagemaker',
                    'MODEL_KEY': 'models/medical_gesture_model.joblib'
                }
            }
        }
        
        with open('lambda_deployment_config.json', 'w') as f:
            json.dump(deployment_config, f, indent=2)
        
        print("✅ Deployment package ready: lambda_deployment_config.json")
        return 'lambda_deployment_config.json'

def main():
    """Main training pipeline"""
    print("🚀 Starting medical gesture training pipeline...")
    print("=" * 60)
    
    # Load SageMaker setup info
    try:
        with open('sagemaker_setup_info.json', 'r') as f:
            setup_info = json.load(f)
        bucket_name = setup_info['s3_bucket']
    except FileNotFoundError:
        print("❌ SageMaker setup info not found. Please run setup-sagemaker.py first.")
        return
    
    # Initialize trainer
    trainer = MedicalGestureTrainer()
    
    # Create synthetic dataset
    X, y = trainer.create_synthetic_dataset(samples_per_gesture=150)
    
    # Train model
    model_artifacts = trainer.train_model(X, y)
    
    # Save to S3
    s3_path = trainer.save_model_to_s3(model_artifacts, bucket_name)
    
    # Generate deployment package
    deployment_config = trainer.generate_deployment_package(model_artifacts)
    
    print("=" * 60)
    print("🎉 Training pipeline completed successfully!")
    print(f"📍 Model location: {s3_path}")
    print(f"📋 Deployment config: {deployment_config}")
    print("🔄 Next steps:")
    print("1. Test model with webcam input")
    print("2. Deploy to Lambda function")
    print("3. Integrate with React frontend")
    print("4. Validate with medical professionals")

if __name__ == "__main__":
    main()
