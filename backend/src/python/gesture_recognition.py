
import json
import os
import boto3
import joblib
from typing import Dict, Any, List

# Try to import ML dependencies, fallback if not available
try:
    import numpy as np
    ML_DEPENDENCIES_AVAILABLE = True
except ImportError:
    ML_DEPENDENCIES_AVAILABLE = False
    # Create a minimal numpy-like interface for basic operations
    class SimpleNumpy:
        @staticmethod
        def max(arr):
            return max(arr) if isinstance(arr, list) else 0.5
    np = SimpleNumpy()

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
          # Check if ML dependencies are available
        if not ML_DEPENDENCIES_AVAILABLE:
            # Return a fallback response when ML libraries aren't available
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'gesture': 'help',  # Default to high priority gesture
                    'confidence': 0.5,
                    'medical_priority': 'high',
                    'urgency_score': 8,
                    'description': 'Fallback mode - ML dependencies not available',
                    'timestamp': context.aws_request_id,
                    'mode': 'fallback'
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
