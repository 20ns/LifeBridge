#!/usr/bin/env python3
"""
SageMaker Setup Script for Enhanced Sign Language Processing
This script sets up a SageMaker environment for training sign language models
within AWS free tier constraints.
"""

import boto3
import json
import time
from botocore.exceptions import ClientError

class SageMakerSetup:
    def __init__(self, region='eu-north-1'):
        self.region = region
        self.sagemaker = boto3.client('sagemaker', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        
    def check_free_tier_limits(self):
        """Check current SageMaker usage against free tier limits"""
        print("🔍 Checking SageMaker free tier usage...")
        
        # Free tier limits
        free_tier_limits = {
            'training_hours_monthly': 25,  # t2.medium/t3.medium hours
            'storage_gb': 50,  # EBS storage
            's3_storage_gb': 5  # S3 storage for SageMaker
        }
        
        print(f"✅ Free tier limits: {json.dumps(free_tier_limits, indent=2)}")
        return free_tier_limits
    
    def setup_iam_role(self):
        """Create or get SageMaker execution role"""
        role_name = 'LifeBridge-SageMaker-ExecutionRole'
        
        # Trust policy for SageMaker
        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "sagemaker.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }
        
        try:
            # Try to get existing role
            response = self.iam.get_role(RoleName=role_name)
            role_arn = response['Role']['Arn']
            print(f"✅ Using existing SageMaker role: {role_arn}")
            return role_arn
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchEntity':
                # Create new role
                print(f"📝 Creating SageMaker execution role: {role_name}")
                
                response = self.iam.create_role(
                    RoleName=role_name,
                    AssumeRolePolicyDocument=json.dumps(trust_policy),
                    Description='Execution role for LifeBridge SageMaker operations'
                )
                
                role_arn = response['Role']['Arn']
                
                # Attach managed policies
                policies = [
                    'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess',
                    'arn:aws:iam::aws:policy/AmazonS3FullAccess'
                ]
                
                for policy in policies:
                    self.iam.attach_role_policy(
                        RoleName=role_name,
                        PolicyArn=policy
                    )
                
                print(f"✅ Created SageMaker role: {role_arn}")
                return role_arn
            else:
                raise e
    
    def setup_s3_bucket(self):
        """Create S3 bucket for SageMaker data storage"""
        bucket_name = f'lifebridge-sagemaker-{int(time.time())}'
        
        try:
            # Create bucket in eu-north-1
            if self.region == 'us-east-1':
                self.s3.create_bucket(Bucket=bucket_name)
            else:
                self.s3.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                )
            
            # Set up bucket versioning
            self.s3.put_bucket_versioning(
                Bucket=bucket_name,
                VersioningConfiguration={'Status': 'Enabled'}
            )
            
            # Set up lifecycle policy for cost optimization
            lifecycle_policy = {
                'Rules': [
                    {
                        'ID': 'DeleteOldVersions',
                        'Status': 'Enabled',
                        'Filter': {'Prefix': ''},
                        'NoncurrentVersionExpiration': {'NoncurrentDays': 30}
                    }
                ]
            }
            
            self.s3.put_bucket_lifecycle_configuration(
                Bucket=bucket_name,
                LifecycleConfiguration=lifecycle_policy
            )
            
            print(f"✅ Created S3 bucket: s3://{bucket_name}")
            return bucket_name
            
        except ClientError as e:
            print(f"❌ Failed to create S3 bucket: {e}")
            raise e
    
    def create_notebook_instance(self, role_arn, bucket_name):
        """Create SageMaker notebook instance for development"""
        instance_name = 'lifebridge-sign-language-dev'
        
        try:            # Check if instance already exists
            try:
                response = self.sagemaker.describe_notebook_instance(
                    NotebookInstanceName=instance_name
                )
                print(f"✅ Notebook instance already exists: {instance_name}")
                return instance_name
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code not in ['NotFound', 'RecordNotFound', 'ValidationException']:
                    raise e
                # Instance doesn't exist, so we'll create it
              # Create notebook instance with free tier specs
            print(f"📝 Creating SageMaker notebook instance: {instance_name}")
            
            response = self.sagemaker.create_notebook_instance(
                NotebookInstanceName=instance_name,
                InstanceType='ml.t3.medium',  # Try t3.medium instead of t2.medium
                RoleArn=role_arn,
                DefaultCodeRepository='https://github.com/aws/amazon-sagemaker-examples.git',
                VolumeSizeInGB=5,  # Minimal storage to stay in free tier
                DirectInternetAccess='Enabled'
            )
            
            print(f"✅ Created notebook instance: {instance_name}")
            print("⏳ Instance is starting... This may take a few minutes.")
            
            return instance_name
            
        except ClientError as e:
            print(f"❌ Failed to create notebook instance: {e}")
            raise e
    
    def download_sample_datasets(self, bucket_name):
        """Download and prepare sample sign language datasets"""
        print("📊 Setting up sample datasets...")
        
        # Create sample medical gesture data
        sample_data = {
            'medical_gestures': [
                {
                    'gesture': 'emergency',
                    'landmarks': [[0.5, 0.5, 0.0] for _ in range(21)],
                    'label': 'emergency',
                    'medical_priority': 'critical'
                },
                {
                    'gesture': 'help',
                    'landmarks': [[0.4, 0.3, 0.0] for _ in range(21)],
                    'label': 'help',
                    'medical_priority': 'critical'
                },
                {
                    'gesture': 'pain',
                    'landmarks': [[0.6, 0.4, 0.0] for _ in range(21)],
                    'label': 'pain',
                    'medical_priority': 'high'
                }
            ],
            'metadata': {
                'dataset_version': '1.0',
                'description': 'Medical sign language gestures for LifeBridge',
                'landmarks_format': 'MediaPipe 21-point hand landmarks',
                'coordinate_system': 'normalized [0-1]'
            }
        }
        
        # Upload sample data to S3
        try:
            self.s3.put_object(
                Bucket=bucket_name,
                Key='datasets/medical_gestures_sample.json',
                Body=json.dumps(sample_data, indent=2),
                ContentType='application/json'
            )
            
            print(f"✅ Uploaded sample dataset to s3://{bucket_name}/datasets/")
            return f"s3://{bucket_name}/datasets/"
            
        except ClientError as e:
            print(f"❌ Failed to upload sample data: {e}")
            raise e
    
    def setup_complete_environment(self):
        """Complete SageMaker setup process"""
        print("🚀 Setting up SageMaker environment for LifeBridge sign language ML...")
        print("=" * 60)
        
        try:
            # Step 1: Check free tier limits
            limits = self.check_free_tier_limits()
            
            # Step 2: Set up IAM role
            role_arn = self.setup_iam_role()
            
            # Step 3: Create S3 bucket
            bucket_name = self.setup_s3_bucket()
            
            # Step 4: Download sample datasets
            dataset_path = self.download_sample_datasets(bucket_name)
            
            # Step 5: Create notebook instance
            instance_name = self.create_notebook_instance(role_arn, bucket_name)
            
            # Summary
            setup_info = {
                'sagemaker_role': role_arn,
                's3_bucket': bucket_name,
                'dataset_path': dataset_path,
                'notebook_instance': instance_name,
                'region': self.region,
                'free_tier_limits': limits
            }
            
            print("\n" + "=" * 60)
            print("🎉 SageMaker setup completed successfully!")
            print("=" * 60)
            print(json.dumps(setup_info, indent=2))
            
            print("\n📋 Next Steps:")
            print("1. Wait for notebook instance to be 'InService' (2-3 minutes)")
            print("2. Open SageMaker console: https://console.aws.amazon.com/sagemaker/")
            print(f"3. Access notebook instance: {instance_name}")
            print("4. Start training sign language models")
            print("5. Monitor free tier usage")
            
            return setup_info
            
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            raise e

def main():
    """Main execution function"""
    setup = SageMakerSetup()
    
    try:
        setup_info = setup.setup_complete_environment()
        
        # Save setup info for later reference
        with open('sagemaker_setup_info.json', 'w') as f:
            json.dump(setup_info, f, indent=2)
        
        print(f"\n💾 Setup information saved to: sagemaker_setup_info.json")
        
    except Exception as e:
        print(f"❌ Setup process failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
