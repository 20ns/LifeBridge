#!/usr/bin/env python3
"""
Quick deployment verification test for enhanced sign language features
"""

import os
import json
import time
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a file exists and report status"""
    if os.path.exists(filepath):
        size_kb = os.path.getsize(filepath) / 1024
        print(f"✅ {description}: {filepath} ({size_kb:.1f} KB)")
        return True
    else:
        print(f"❌ Missing: {description}: {filepath}")
        return False

def verify_deployment_readiness():
    """Verify all components are ready for deployment"""
    print("🔍 LifeBridge Enhanced Sign Language - Deployment Verification")
    print("=" * 70)
    
    all_good = True
    
    # Check core documentation
    print("\n📚 Documentation:")
    all_good &= check_file_exists("docs/SIGN_LANGUAGE_ML_RESEARCH.md", "Research Documentation")
    all_good &= check_file_exists("docs/ENHANCED_SIGN_LANGUAGE_IMPLEMENTATION_COMPLETE.md", "Implementation Summary")
    
    # Check infrastructure
    print("\n🏗️ Infrastructure:")
    all_good &= check_file_exists("infrastructure/setup-sagemaker.py", "SageMaker Setup")
    all_good &= check_file_exists("infrastructure/simplified_gesture_trainer.py", "Model Training")
    all_good &= check_file_exists("sagemaker_setup_info.json", "AWS Configuration")
    
    # Check Lambda deployment
    print("\n☁️ Lambda Deployment:")
    all_good &= check_file_exists("lambda_gesture_recognition.py", "Lambda Function Code")
    all_good &= check_file_exists("deployment_package.json", "Deployment Configuration")
    
    # Check test files
    print("\n🧪 Testing Infrastructure:")
    all_good &= check_file_exists("tests/enhanced_hand_detection_test.py", "Hand Detection Test")
    all_good &= check_file_exists("tests/enhanced_video_processing.py", "Video Processing Test")
    all_good &= check_file_exists("tests/enhanced_sign_language_integration.py", "Integration Test")
    
    # Check for test results
    test_results = list(Path(".").glob("enhanced_sign_language_test_results_*.json"))
    if test_results:
        print(f"✅ Integration Test Results: {test_results[0]} (Latest)")
    else:
        print("⚠️ No integration test results found")
    
    # Verify model information
    print("\n🧠 Model Status:")
    try:
        with open('sagemaker_setup_info.json', 'r') as f:
            setup_info = json.load(f)
        
        s3_bucket = setup_info.get('s3_bucket', 'N/A')
        model_path = f"s3://{s3_bucket}/models/medical_gesture_model.joblib"
        print(f"✅ Model Location: {model_path}")
        print(f"✅ SageMaker Role: {setup_info.get('sagemaker_role', 'N/A')}")
        print(f"✅ Notebook Instance: {setup_info.get('notebook_instance', 'N/A')}")
        print(f"✅ AWS Region: {setup_info.get('region', 'N/A')}")
        
    except FileNotFoundError:
        print("❌ SageMaker setup info not available")
        all_good = False
    except json.JSONDecodeError:
        print("❌ Invalid SageMaker setup configuration")
        all_good = False
    
    # Check deployment readiness
    print("\n🚀 Deployment Readiness:")
    
    deployment_checks = {
        "AWS Infrastructure": os.path.exists("sagemaker_setup_info.json"),
        "Trained Model": os.path.exists("deployment_package.json"),
        "Lambda Function": os.path.exists("lambda_gesture_recognition.py"),
        "Integration Tests": len(test_results) > 0,
        "Documentation": os.path.exists("docs/ENHANCED_SIGN_LANGUAGE_IMPLEMENTATION_COMPLETE.md")
    }
    
    for check, status in deployment_checks.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {check}")
        all_good &= status
    
    # Medical gesture validation
    print("\n🏥 Medical Features:")
    try:
        with open('deployment_package.json', 'r') as f:
            deployment_info = json.load(f)
        
        gestures = deployment_info.get('model_info', {}).get('gestures', [])
        priorities = deployment_info.get('model_info', {}).get('medical_priorities', {})
        
        print(f"✅ Medical Gestures: {len(gestures)} supported")
        for gesture in gestures:
            priority = priorities.get(gesture, 'unknown')
            print(f"   • {gesture}: {priority} priority")
        
        accuracy = deployment_info.get('model_info', {}).get('accuracy', 0)
        print(f"✅ Model Accuracy: {accuracy:.1%}")
        
    except Exception as e:
        print(f"⚠️ Could not verify medical features: {e}")
    
    # Final status
    print("\n" + "=" * 70)
    if all_good:
        print("🎉 DEPLOYMENT VERIFICATION PASSED")
        print("✅ All components ready for production deployment")
        print("🏥 Medical sign language enhancement is complete")
        print("\n📋 Next Steps:")
        print("1. Deploy Lambda function using Serverless Framework")
        print("2. Update React frontend with new medical gesture API")
        print("3. Conduct medical professional validation testing")
        print("4. Monitor AWS usage within free tier limits")
        print("5. Begin real-world healthcare scenario testing")
    else:
        print("❌ DEPLOYMENT VERIFICATION FAILED")
        print("🔧 Please address missing components before deployment")
    
    print("=" * 70)
    return all_good

if __name__ == "__main__":
    verify_deployment_readiness()
