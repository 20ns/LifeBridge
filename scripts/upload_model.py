#!/usr/bin/env python3
"""
Upload trained model artifacts to S3 for Lambda deployment
"""
import os
import boto3
import joblib
import json
from datetime import datetime

def upload_model_to_s3():
    """Upload the trained model artifacts to S3"""
    
    # Initialize S3 client
    s3 = boto3.client('s3')
    
    # Configuration
    bucket_name = 'lifebridge-ml-models-dev'
    model_key = 'gesture_recognition/model.joblib'
    
    print("Creating S3 bucket if it doesn't exist...")
    try:
        s3.create_bucket(
            Bucket=bucket_name,
            CreateBucketConfiguration={'LocationConstraint': 'eu-north-1'}
        )
        print(f"Created bucket: {bucket_name}")
    except s3.exceptions.BucketAlreadyExists:
        print(f"Bucket {bucket_name} already exists")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        print(f"Bucket {bucket_name} already owned by you")
    
    # Create a minimal model for initial deployment
    # In production, this would be the actual trained model
    print("Creating minimal model artifacts...")
    
    # Medical gesture definitions
    gesture_definitions = {
        'pain': {
            'priority': 'high',
            'urgency_score': 8,
            'description': 'Patient indicating pain or discomfort'
        },
        'help': {
            'priority': 'emergency',
            'urgency_score': 10,
            'description': 'Patient requesting immediate assistance'
        },
        'difficulty_breathing': {
            'priority': 'emergency',
            'urgency_score': 10,
            'description': 'Patient indicating respiratory distress'
        },
        'chest_pain': {
            'priority': 'emergency',
            'urgency_score': 10,
            'description': 'Patient indicating chest pain or cardiac distress'
        },
        'nausea': {
            'priority': 'medium',
            'urgency_score': 5,
            'description': 'Patient indicating nausea or stomach upset'
        },
        'dizzy': {
            'priority': 'medium',
            'urgency_score': 6,
            'description': 'Patient indicating dizziness or vertigo'
        },
        'thank_you': {
            'priority': 'low',
            'urgency_score': 1,
            'description': 'Patient expressing gratitude'
        },
        'yes': {
            'priority': 'low',
            'urgency_score': 1,
            'description': 'Patient confirming or agreeing'
        },
        'no': {
            'priority': 'low',
            'urgency_score': 1,
            'description': 'Patient declining or disagreeing'
        },
        'water': {
            'priority': 'low',
            'urgency_score': 2,
            'description': 'Patient requesting water'
        }
    }
    
    # Create a simple model (for demonstration, in production use trained model)
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    import numpy as np
    
    # Create minimal training data
    X = np.random.rand(100, 67)  # 67 features from MediaPipe landmarks
    y = np.random.choice(list(gesture_definitions.keys()), 100)
    
    # Train minimal model
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model.fit(X_scaled, y)
    
    # Package artifacts
    model_artifacts = {
        'model': model,
        'scaler': scaler,
        'gesture_definitions': gesture_definitions,
        'version': '1.0.0',
        'created_at': datetime.now().isoformat(),
        'model_type': 'medical_sign_language_gesture_recognition'
    }
      # Save locally first
    import tempfile
    local_model_path = os.path.join(tempfile.gettempdir(), 'model.joblib')
    joblib.dump(model_artifacts, local_model_path)
    
    print(f"Uploading model to s3://{bucket_name}/{model_key}...")
    s3.upload_file(local_model_path, bucket_name, model_key)
    
    print("Model upload completed successfully!")
    print(f"Model location: s3://{bucket_name}/{model_key}")
    print(f"Gesture classes: {list(gesture_definitions.keys())}")
    
    # Cleanup
    os.remove(local_model_path)
    
    return {
        'bucket': bucket_name,
        'key': model_key,
        'gestures': list(gesture_definitions.keys())
    }

if __name__ == "__main__":
    result = upload_model_to_s3()
    print(json.dumps(result, indent=2))
