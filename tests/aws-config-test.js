// Test AWS configuration and create S3 bucket
const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

const REGION = 'us-east-1';
const BUCKET_NAME = 'lifebridge-transcribe-temp-dev';

const s3Client = new S3Client({
  region: REGION,
  // For local development, AWS SDK will use default credential chain
  // This includes environment variables, AWS credentials file, IAM roles, etc.
});

async function testAWSConfig() {
  console.log('🔧 Testing AWS configuration...');
  
  try {
    // Test if bucket exists
    console.log(`Checking if bucket ${BUCKET_NAME} exists...`);
    
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
      console.log('✅ Bucket already exists');
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log('❌ Bucket does not exist, attempting to create...');
        
        // Create the bucket
        const createCommand = new CreateBucketCommand({
          Bucket: BUCKET_NAME,
          // For us-east-1, don't specify CreateBucketConfiguration
        });
        
        await s3Client.send(createCommand);
        console.log('✅ Bucket created successfully');
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ AWS configuration test failed:', error.message);
    
    if (error.name === 'CredentialsProviderError') {
      console.log('\n💡 AWS Credentials not found. Please configure them using one of:');
      console.log('   1. AWS CLI: aws configure');
      console.log('   2. Environment variables: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
      console.log('   3. IAM role (if running on EC2)');
      console.log('   4. AWS credentials file (~/.aws/credentials)');
    }
    
    return false;
  }
}

// Run the test
testAWSConfig().then(success => {
  if (success) {
    console.log('\n🎉 AWS configuration is working! Ready for speech transcription.');
  } else {
    console.log('\n⚠️  Please fix AWS configuration before testing speech features.');
  }
  process.exit(success ? 0 : 1);
});
