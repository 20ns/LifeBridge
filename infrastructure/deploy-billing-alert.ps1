# LifeBridge AI - Deploy Billing Alert Script
Write-Host "Deploying LifeBridge AI Billing Alert (£0.00 GBP)..." -ForegroundColor Green

# Check AWS CLI configuration
Write-Host "Checking AWS CLI configuration..."
aws configure list

if ($LASTEXITCODE -ne 0) {
    Write-Host "AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

Write-Host "AWS CLI is configured" -ForegroundColor Green

# Deploy the billing alert
Write-Host "Creating CloudWatch billing alert..."

# Create the alarm using AWS CLI with proper JSON file input
aws cloudwatch put-metric-alarm --cli-input-json file://billing-alert.json --region eu-north-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Billing alert deployed successfully!" -ForegroundColor Green
    Write-Host "Alert will trigger when AWS charges exceed £0.00 (GBP)" -ForegroundColor Cyan
    Write-Host "Make sure to configure SNS topic for notifications if needed" -ForegroundColor Yellow
} else {
    Write-Host "Failed to deploy billing alert" -ForegroundColor Red
}

Write-Host "Billing alert deployment complete!" -ForegroundColor Green
