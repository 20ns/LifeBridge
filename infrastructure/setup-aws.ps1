# LifeBridge AI - AWS Setup Script
# This script sets up the necessary AWS services for the project

Write-Host "🚀 Setting up LifeBridge AI AWS Infrastructure..." -ForegroundColor Green

# Check AWS CLI configuration
Write-Host "📋 Checking AWS CLI configuration..."
$awsConfig = aws configure list
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
} else {
    Write-Host "❌ AWS CLI configuration failed" -ForegroundColor Red
    exit 1
}

# Check available AWS services in free tier
Write-Host "🔍 Checking AWS Free Tier services..."

# Test AWS Bedrock access
Write-Host "🧠 Checking AWS Bedrock access..."
try {
    $bedrockModels = aws bedrock list-foundation-models --region eu-north-1 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bedrock access confirmed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Bedrock access needs to be enabled in AWS Console" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Bedrock access needs to be enabled in AWS Console" -ForegroundColor Yellow
}

# Create S3 bucket for the project
$bucketName = "lifebridge-ai-$(Get-Date -Format 'yyyyMMdd')-$(Get-Random -Maximum 9999)"
Write-Host "📦 Creating S3 bucket: $bucketName"
try {
    aws s3 mb "s3://$bucketName" --region eu-north-1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ S3 bucket created successfully" -ForegroundColor Green
        # Save bucket name for later use
        $bucketName | Out-File -FilePath "bucket-name.txt"
    }
} catch {
    Write-Host "⚠️ S3 bucket creation failed" -ForegroundColor Yellow
}

Write-Host "🎉 AWS setup complete! Next steps:" -ForegroundColor Green
Write-Host "1. Enable Bedrock access in AWS Console" -ForegroundColor Cyan
Write-Host "2. Set up billing alerts in AWS Console" -ForegroundColor Cyan
Write-Host "3. Continue with Day 2 - Bedrock Integration" -ForegroundColor Cyan
