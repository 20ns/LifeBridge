# PowerShell script to add demo reviews to LifeBridge Medical Translation Review Dashboard
# This script sets up environment and runs the Node.js demo data entry script

Write-Host "🏥 LifeBridge Demo Data Entry Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js to continue." -ForegroundColor Red
    exit 1
}

# Check if AWS CLI is configured
try {
    $awsAccount = aws sts get-caller-identity --query Account --output text 2>$null
    if ($awsAccount) {
        Write-Host "✅ AWS CLI configured for account: $awsAccount" -ForegroundColor Green
    } else {
        Write-Host "⚠️  AWS CLI not configured. Using default credentials..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  AWS CLI not found or not configured. Using default credentials..." -ForegroundColor Yellow
}

# Set environment variables
$env:AWS_REGION = "eu-north-1"
$env:STAGE = "dev"

Write-Host ""
Write-Host "📊 Configuration:" -ForegroundColor Blue
Write-Host "   Region: $env:AWS_REGION"
Write-Host "   Stage: $env:STAGE"
Write-Host "   Table: lifebridge-review-requests-$env:STAGE"
Write-Host ""

# Navigate to the scripts directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

# Check if the demo script exists
if (-not (Test-Path "add-demo-reviews.js")) {
    Write-Host "❌ Demo script not found at: $(Get-Location)\add-demo-reviews.js" -ForegroundColor Red
    exit 1
}

# Install required dependencies if package.json exists
if (Test-Path "../backend/package.json") {
    Write-Host "📦 Installing AWS SDK dependencies..." -ForegroundColor Blue
    Set-Location "../backend"
    npm install --silent @aws-sdk/client-dynamodb
    Set-Location "../scripts"
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️  Backend package.json not found. Make sure AWS SDK is available." -ForegroundColor Yellow
}

# Run the demo data entry script
Write-Host "🚀 Running demo data entry script..." -ForegroundColor Blue
Write-Host ""

try {
    node add-demo-reviews.js
    Write-Host ""
    Write-Host "✅ Demo data entry completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Next Steps:" -ForegroundColor Blue
    Write-Host "   1. Open your LifeBridge frontend application"
    Write-Host "   2. Navigate to the Review Dashboard (or add ?mode=review to URL)"
    Write-Host "   3. View the demo medical translation reviews"
    Write-Host ""
    Write-Host "📋 Demo Data Includes:" -ForegroundColor Blue
    Write-Host "   • Emergency cardiac translation (Critical priority)"
    Write-Host "   • Medication dosage instructions (High priority)"
    Write-Host "   • Patient consultation dialogue (Medium priority)"
    Write-Host "   • Emergency intubation procedure (Critical priority)"
    Write-Host "   • Allergy alert information (High priority)"
    Write-Host ""
    Write-Host "🎯 Demonstrates:" -ForegroundColor Blue
    Write-Host "   • Quality scoring and metrics"
    Write-Host "   • Bias detection and cultural appropriateness"
    Write-Host "   • Human review workflow"
    Write-Host "   • Medical terminology validation"
    Write-Host "   • Emergency vs consultation contexts"
    
} catch {
    Write-Host "❌ Error running demo script: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   • Ensure AWS credentials are configured (aws configure)"
    Write-Host "   • Verify the DynamoDB table exists: lifebridge-review-requests-$env:STAGE"
    Write-Host "   • Check that the backend is deployed: cd backend && serverless deploy"
    Write-Host "   • Verify region access: $env:AWS_REGION"
    exit 1
}

Write-Host ""
Write-Host "🎉 Demo setup complete! Ready for demonstration." -ForegroundColor Green
