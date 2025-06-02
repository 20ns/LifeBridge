# LifeBridge AI - AWS Setup Script
Write-Host "Setting up LifeBridge AI AWS Infrastructure..." -ForegroundColor Green

# Check AWS CLI configuration
Write-Host "Checking AWS CLI configuration..."
aws configure list
if ($LASTEXITCODE -eq 0) {
    Write-Host "AWS CLI is configured" -ForegroundColor Green
} else {
    Write-Host "AWS CLI configuration failed" -ForegroundColor Red
    exit 1
}

# Test AWS Bedrock access
Write-Host "Checking AWS Bedrock access..."
aws bedrock list-foundation-models --region us-east-1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Bedrock access confirmed" -ForegroundColor Green
} else {
    Write-Host "Bedrock access needs to be enabled in AWS Console" -ForegroundColor Yellow
}

Write-Host "AWS setup complete!" -ForegroundColor Green
