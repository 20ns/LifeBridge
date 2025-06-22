#!/usr/bin/env python3
"""
Simplified Medical Sign Language Gesture Training Script
This script trains a lightweight model for medical sign language recognition
without MediaPipe dependencies for initial development.
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
from typing import List, Tuple, Dict, Any

class SimplifiedMedicalGestureTrainer:
    def __init__(self, region='eu-north-1'):
        self.region = region
        self.s3 = boto3.client('s3', region_name=region)
        
        # Medical gesture definitions
        self.medical_gestures = {
            'emergency': {
                'priority': 'critical',
                'description': 'Emergency assistance needed',
                'hand_shape': 'flat_hand_raised',
                'urgency_score': 10
            },
            'help': {
                'priority': 'critical', 
                'description': 'Request for help',
                'hand_shape': 'pointing_gesture',
                'urgency_score': 9
            },
            'pain': {
                'priority': 'high',
                'description': 'Indicating pain or discomfort',
                'hand_shape': 'closed_fist',
                'urgency_score': 7
            },
            'medicine': {
                'priority': 'medium',
                'description': 'Request for medication',
                'hand_shape': 'pinch_gesture',
                'urgency_score': 5
            },
            'water': {
                'priority': 'medium',
                'description': 'Request for water',
                'hand_shape': 'cup_gesture',
                'urgency_score': 4
            },
            'yes': {
                'priority': 'low',
                'description': 'Affirmative response',
                'hand_shape': 'thumbs_up',
                'urgency_score': 2
            },
            'no': {
                'priority': 'low', 
                'description': 'Negative response',
                'hand_shape': 'thumbs_down',
                'urgency_score': 2
            }
        }
        
    def create_synthetic_hand_features(self, gesture_name: str, num_landmarks=21) -> np.ndarray:
        """Create synthetic hand landmark features for a specific gesture"""
        # Feature vector: [x1, y1, z1, x2, y2, z2, ..., additional_features]
        features = []
        
        # Base gesture patterns
        gesture_patterns = {
            'emergency': {
                'finger_extension': [1.0, 1.0, 1.0, 1.0, 1.0],  # All fingers extended
                'hand_height': 0.8,  # High position
                'hand_openness': 0.9,  # Very open
                'stability': 0.7  # Moderate stability (urgent movement)
            },
            'help': {
                'finger_extension': [0.2, 1.0, 0.3, 0.3, 0.3],  # Index finger extended
                'hand_height': 0.6,
                'hand_openness': 0.4,
                'stability': 0.8
            },
            'pain': {
                'finger_extension': [0.1, 0.1, 0.1, 0.1, 0.1],  # Fist
                'hand_height': 0.5,
                'hand_openness': 0.1,
                'stability': 0.5  # Low stability (pain causes trembling)
            },
            'medicine': {
                'finger_extension': [0.8, 0.6, 0.2, 0.2, 0.2],  # Pinch gesture
                'hand_height': 0.5,
                'hand_openness': 0.3,
                'stability': 0.9  # High precision needed
            },
            'water': {
                'finger_extension': [0.7, 0.8, 0.8, 0.8, 0.6],  # Cup shape
                'hand_height': 0.4,
                'hand_openness': 0.6,
                'stability': 0.8
            },
            'yes': {
                'finger_extension': [1.0, 0.2, 0.2, 0.2, 0.2],  # Thumbs up
                'hand_height': 0.6,
                'hand_openness': 0.5,
                'stability': 0.9
            },
            'no': {
                'finger_extension': [0.1, 0.2, 0.2, 0.2, 0.2],  # Thumbs down
                'hand_height': 0.4,
                'hand_openness': 0.3,
                'stability': 0.9
            }
        }
        
        pattern = gesture_patterns.get(gesture_name, gesture_patterns['help'])
        
        # Generate landmark coordinates
        for i in range(num_landmarks):
            # Add noise to make data more realistic
            noise_factor = 0.05
            
            # X coordinate (horizontal position)
            base_x = 0.5
            if i in [4, 8, 12, 16, 20]:  # Fingertips
                finger_idx = [4, 8, 12, 16, 20].index(i)
                extension = pattern['finger_extension'][finger_idx]
                base_x += (extension - 0.5) * 0.3
            
            x = base_x + np.random.normal(0, noise_factor)
            
            # Y coordinate (vertical position)
            base_y = pattern['hand_height']
            if i in [4, 8, 12, 16, 20]:  # Fingertips
                finger_idx = [4, 8, 12, 16, 20].index(i)
                extension = pattern['finger_extension'][finger_idx]
                base_y -= extension * 0.2
            
            y = base_y + np.random.normal(0, noise_factor)
            
            # Z coordinate (depth)
            z = np.random.normal(0, 0.02)
            
            features.extend([
                max(0, min(1, x)),
                max(0, min(1, y)), 
                z
            ])
        
        # Add derived features
        features.extend([
            pattern['hand_openness'] + np.random.normal(0, 0.05),
            pattern['stability'] + np.random.normal(0, 0.05),
            self.medical_gestures[gesture_name]['urgency_score'] / 10.0,
            len(gesture_name) / 10.0  # Gesture name length as feature
        ])
        
        return np.array(features)
    
    def create_synthetic_dataset(self, samples_per_gesture=200) -> Tuple[np.ndarray, np.ndarray]:
        """Create synthetic training data for medical gestures"""
        print("🏗️ Creating synthetic training dataset...")
        
        features = []
        labels = []
        
        for gesture_name, gesture_info in self.medical_gestures.items():
            print(f"   Generating {samples_per_gesture} samples for '{gesture_name}' (urgency: {gesture_info['urgency_score']})")
            
            for _ in range(samples_per_gesture):
                feature_vector = self.create_synthetic_hand_features(gesture_name)
                features.append(feature_vector)
                labels.append(gesture_name)
        
        X = np.array(features)
        y = np.array(labels)
        
        print(f"✅ Dataset created: {X.shape[0]} samples, {X.shape[1]} features")
        print(f"📊 Gesture distribution:")
        unique, counts = np.unique(y, return_counts=True)
        for gesture, count in zip(unique, counts):
            urgency = self.medical_gestures[gesture]['urgency_score']
            print(f"   {gesture}: {count} samples (urgency: {urgency})")
        
        return X, y
    
    def train_model(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Train lightweight model for gesture recognition"""
        print("🧠 Training medical gesture recognition model...")
        
        # Split data with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Random Forest optimized for medical use
        model = RandomForestClassifier(
            n_estimators=100,  # More trees for better medical accuracy
            max_depth=15,      # Deeper trees for complex gesture patterns
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'  # Handle class imbalance
        )
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = model.predict(X_test_scaled)
        y_pred_proba = model.predict_proba(X_test_scaled)
        
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Model trained with accuracy: {accuracy:.3f}")
        print("📊 Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Feature importance analysis
        feature_importance = model.feature_importances_
        print("🔍 Top 10 Most Important Features:")
        top_features = np.argsort(feature_importance)[-10:][::-1]
        for i, feat_idx in enumerate(top_features):
            print(f"   {i+1}. Feature {feat_idx}: {feature_importance[feat_idx]:.4f}")
        
        # Medical priority analysis
        print("🏥 Medical Priority Analysis:")
        for gesture in self.medical_gestures:
            gesture_mask = y_test == gesture
            if np.any(gesture_mask):
                gesture_accuracy = accuracy_score(y_test[gesture_mask], y_pred[gesture_mask])
                urgency = self.medical_gestures[gesture]['urgency_score']
                print(f"   {gesture}: {gesture_accuracy:.3f} accuracy (urgency: {urgency})")
          # Calculate model size
        import pickle
        model_size_kb = len(pickle.dumps(model)) / 1024
        
        model_artifacts = {
            'model': model,
            'scaler': scaler,
            'accuracy': accuracy,
            'gesture_definitions': self.medical_gestures,
            'feature_importance': feature_importance.tolist(),
            'model_size_kb': model_size_kb,
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }
        
        return model_artifacts
    
    def save_model_to_s3(self, model_artifacts: Dict[str, Any], bucket_name: str) -> str:
        """Save trained model to S3 for Lambda deployment"""
        print("💾 Saving model to S3...")
        
        # Save locally first
        local_model_path = 'medical_gesture_model.joblib'
        joblib.dump(model_artifacts, local_model_path)
        
        # Check model size
        model_size_mb = os.path.getsize(local_model_path) / (1024 * 1024)
        print(f"📏 Model size: {model_size_mb:.2f} MB")
        
        if model_size_mb > 5:
            print("⚠️ Warning: Model might be too large for Lambda (>5MB)")
        
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
    
    def create_lambda_deployment_code(self, model_artifacts: Dict[str, Any]) -> str:
        """Create Lambda function code for gesture recognition"""
        
        lambda_code = '''
import json
import boto3
import joblib
import numpy as np
from typing import Dict, Any, List

# Lambda function for medical gesture recognition
def lambda_handler(event, context):
    """
    AWS Lambda handler for medical sign language gesture recognition
    """
    try:
        # Parse input
        body = json.loads(event.get('body', '{}'))
        landmarks = body.get('landmarks', [])
        
        if not landmarks:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'No landmarks provided',
                    'medical_priority': 'unknown'
                })
            }
        
        # Load model from S3 (cached in Lambda container)
        s3 = boto3.client('s3')
        bucket = os.environ['MODEL_BUCKET']
        key = os.environ['MODEL_KEY']
        
        # Download and load model
        s3.download_file(bucket, key, '/tmp/model.joblib')
        model_artifacts = joblib.load('/tmp/model.joblib')
        
        # Extract features from landmarks
        features = extract_features_from_landmarks(landmarks)
        
        # Scale features
        scaler = model_artifacts['scaler']
        features_scaled = scaler.transform([features])
        
        # Predict gesture
        model = model_artifacts['model']
        prediction = model.predict(features_scaled)[0]
        confidence = np.max(model.predict_proba(features_scaled)[0])
        
        # Get medical information
        gesture_info = model_artifacts['gesture_definitions'][prediction]
        
        response = {
            'gesture': prediction,
            'confidence': float(confidence),
            'medical_priority': gesture_info['priority'],
            'urgency_score': gesture_info['urgency_score'],
            'description': gesture_info['description'],
            'timestamp': context.aws_request_id
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'medical_priority': 'error'
            })
        }

def extract_features_from_landmarks(landmarks: List[Dict]) -> List[float]:
    """Extract features from MediaPipe landmarks"""
    features = []
    
    # Convert landmarks to feature vector
    for landmark in landmarks:
        features.extend([
            landmark.get('x', 0.0),
            landmark.get('y', 0.0),
            landmark.get('z', 0.0)
        ])
    
    # Pad or truncate to expected size
    expected_size = 67  # 21 landmarks * 3 + 4 derived features
    while len(features) < expected_size:
        features.append(0.0)
    
    return features[:expected_size]
'''
        
        # Save Lambda code
        with open('lambda_gesture_recognition.py', 'w') as f:
            f.write(lambda_code)
        
        print("✅ Lambda deployment code created: lambda_gesture_recognition.py")
        return 'lambda_gesture_recognition.py'
    
    def generate_deployment_package(self, model_artifacts: Dict[str, Any]) -> str:
        """Generate deployment package and instructions"""
        print("📦 Generating deployment package...")
        
        deployment_info = {
            'model_info': {
                'accuracy': model_artifacts['accuracy'],
                'model_size_kb': model_artifacts['model_size_kb'],
                'training_samples': model_artifacts['training_samples'],
                'gestures': list(self.medical_gestures.keys()),
                'medical_priorities': {
                    gesture: info['priority'] 
                    for gesture, info in self.medical_gestures.items()
                }
            },
            'aws_deployment': {
                'lambda_runtime': 'python3.9',
                'memory_mb': 512,
                'timeout_seconds': 30,
                'environment_variables': {
                    'MODEL_BUCKET': '${S3_BUCKET}',
                    'MODEL_KEY': 'models/medical_gesture_model.joblib'
                },
                'required_layers': [
                    'arn:aws:lambda:eu-north-1:336392948345:layer:AWSSDKPandas-Python39:1'
                ]
            },
            'integration_steps': [
                "1. Deploy Lambda function with provided code",
                "2. Set up API Gateway endpoint",
                "3. Update React frontend to use new endpoint",
                "4. Test with medical professionals",
                "5. Monitor accuracy and performance"
            ]
        }
        
        with open('deployment_package.json', 'w') as f:
            json.dump(deployment_info, f, indent=2)
        
        print("✅ Deployment package ready: deployment_package.json")
        return 'deployment_package.json'

def main():
    """Main training pipeline"""
    print("🚀 Starting simplified medical gesture training pipeline...")
    print("=" * 70)
    
    # Load SageMaker setup info
    try:
        with open('sagemaker_setup_info.json', 'r') as f:
            setup_info = json.load(f)
        bucket_name = setup_info['s3_bucket']
        print(f"📦 Using S3 bucket: {bucket_name}")
    except FileNotFoundError:
        print("❌ SageMaker setup info not found. Please run setup-sagemaker.py first.")
        return
    
    # Initialize trainer
    trainer = SimplifiedMedicalGestureTrainer()
    
    # Create synthetic dataset
    print("\n🎯 Phase 1: Dataset Creation")
    X, y = trainer.create_synthetic_dataset(samples_per_gesture=200)
    
    # Train model
    print("\n🧠 Phase 2: Model Training")
    model_artifacts = trainer.train_model(X, y)
    
    # Save to S3
    print("\n💾 Phase 3: Model Deployment")
    s3_path = trainer.save_model_to_s3(model_artifacts, bucket_name)
    
    # Generate Lambda code
    lambda_code_file = trainer.create_lambda_deployment_code(model_artifacts)
    
    # Generate deployment package
    deployment_config = trainer.generate_deployment_package(model_artifacts)
    
    print("\n" + "=" * 70)
    print("🎉 Training pipeline completed successfully!")
    print("=" * 70)
    print(f"📊 Model Performance:")
    print(f"   Accuracy: {model_artifacts['accuracy']:.3f}")
    print(f"   Model Size: {model_artifacts['model_size_kb']:.1f} KB")
    print(f"   Training Samples: {model_artifacts['training_samples']}")
    print(f"\n📍 Files Created:")
    print(f"   Model: {s3_path}")
    print(f"   Lambda Code: {lambda_code_file}")
    print(f"   Deployment Config: {deployment_config}")
    print(f"\n🔄 Next Steps:")
    print("1. Test model integration with existing sign language detector")
    print("2. Deploy Lambda function using generated code")
    print("3. Update React frontend to use new medical gesture recognition")
    print("4. Validate accuracy with healthcare professionals")
    print("5. Monitor performance and retrain as needed")

if __name__ == "__main__":
    main()
