# LifeBridge Medical-Grade Deployment Guide

This guide covers the deployment of LifeBridge's medical-grade features including HIPAA compliance, human-in-the-loop quality assurance, and comprehensive audit trails.

## Prerequisites

### AWS Account Setup
1. AWS Account with appropriate permissions for:
   - Lambda functions
   - DynamoDB tables
   - KMS key management
   - SNS topics
   - CloudWatch logs
   - IAM role management

2. AWS CLI configured with proper credentials
3. Node.js 20.x installed
4. Serverless Framework installed globally

## Medical-Grade Infrastructure Deployment

### 1. Backend Deployment with Medical Services

```bash
cd backend

# Install dependencies including medical-grade services
npm install @aws-sdk/client-dynamodb @aws-sdk/client-kms @aws-sdk/client-sns @aws-sdk/client-cloudwatch-logs

# Build TypeScript
npm run build

# Deploy with medical-grade infrastructure
serverless deploy --stage prod

# Verify medical-grade tables are created
aws dynamodb list-tables --region eu-north-1 | grep lifebridge
```

This deployment will create:
- **HIPAA-compliant audit logging table** with encryption at rest
- **Human review workflow table** for quality assurance
- **Impact metrics table** for quantitative tracking
- **KMS encryption key** for medical data protection
- **SNS topic** for real-time review notifications

### 2. Configure Medical Professional Access

Create IAM roles for medical professionals to access the review dashboard:

```bash
# Create medical reviewer role (run in AWS CloudShell or local AWS CLI)
aws iam create-role \
  --role-name LifeBridge-Medical-Reviewer \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:root"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach necessary permissions for review dashboard
aws iam put-role-policy \
  --role-name LifeBridge-Medical-Reviewer \
  --policy-name LifeBridge-Review-Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ],
        "Resource": [
          "arn:aws:dynamodb:eu-north-1:*:table/lifebridge-review-requests-*",
          "arn:aws:dynamodb:eu-north-1:*:table/lifebridge-audit-logs-*"
        ]
      }
    ]
  }'
```

### 3. Frontend Deployment with Review Dashboard

```bash
cd frontend

# Install dependencies
npm install

# Build for production with medical-grade features
npm run build

# Deploy to S3 or CloudFront (example with S3)
aws s3 sync build/ s3://your-lifebridge-frontend-bucket/ \
  --delete \
  --region eu-north-1
```

## Medical Compliance Configuration

### 1. Enable HIPAA Audit Logging

The audit logging is automatically enabled upon deployment. Verify it's working:

```bash
# Test audit logging endpoint
curl -X POST https://your-api-gateway-url/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient has chest pain",
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "context": "emergency"
  }'

# Check audit logs were created
aws dynamodb scan \
  --table-name lifebridge-audit-logs-prod \
  --limit 5 \
  --region eu-north-1
```

### 2. Configure PHI Redaction

PHI (Protected Health Information) redaction is automatically enabled with configurable strictness:

- **Emergency mode**: Less strict to preserve critical information
- **Standard mode**: Comprehensive PHI detection and redaction
- **Strict mode**: Maximum privacy protection

### 3. Set Up Human Review Notifications

Configure SNS subscriptions for medical professionals:

```bash
# Subscribe medical professionals to review alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:eu-north-1:YOUR-ACCOUNT-ID:lifebridge-review-alerts-prod \
  --protocol email \
  --notification-endpoint medical-team@yourhospital.com
```

## Quality Assurance Setup

### 1. Medical Professional Dashboard Access

Medical professionals can access the review dashboard at:
`https://your-frontend-url/?mode=review`

Or use the mode switcher in the application header.

### 2. Review Workflow Configuration

The system automatically flags translations for human review based on:
- Quality score below 70%
- Detected bias or cultural insensitivity
- Potential hallucinations in medical context
- Emergency translations with low confidence
- PHI detection requiring manual verification

### 3. Emergency Review Escalation

Critical translations are automatically escalated with:
- <30 second response time requirement
- Immediate SNS notifications
- Dashboard priority highlighting
- Audit trail logging

## Monitoring and Compliance

### 1. CloudWatch Dashboard

Create a medical compliance monitoring dashboard:

```bash
# Create CloudWatch dashboard for medical metrics
aws cloudwatch put-dashboard \
  --dashboard-name "LifeBridge-Medical-Compliance" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/Lambda", "Duration", "FunctionName", "lifebridge-backend-prod-translate"],
            ["AWS/Lambda", "Errors", "FunctionName", "lifebridge-backend-prod-translate"]
          ],
          "period": 300,
          "stat": "Average",
          "region": "eu-north-1",
          "title": "Translation Performance"
        }
      }
    ]
  }'
```

### 2. Compliance Reporting

Generate compliance reports:

```bash
# Example API call to get compliance metrics
curl -X GET "https://your-api-gateway-url/review/metrics?timeframe=24h" \
  -H "Authorization: Bearer YOUR-AUTH-TOKEN"
```

## Impact Metrics Collection

### 1. Pilot Study Configuration

For healthcare institutions running pilot studies:

```javascript
// Example impact metrics recording
const metrics = {
  beforeLifeBridge: {
    communicationTime: 1800, // 30 minutes
    errorCount: 3,
    satisfactionScore: 6.2
  },
  afterLifeBridge: {
    communicationTime: 300, // 5 minutes
    errorCount: 0,
    satisfactionScore: 9.1
  },
  medicalOutcome: "improved_diagnosis_speed",
  patientId: "anonymized-patient-123"
};
```

### 2. Cost Savings Analysis

The system automatically tracks:
- Interpretation service cost savings
- Reduced wait times
- Decreased missed appointments
- Staff overtime reduction

## Security Best Practices

### 1. Data Encryption

- All data is encrypted at rest using AWS KMS
- In-transit encryption via HTTPS/TLS
- PHI is automatically detected and redacted

### 2. Access Control

- Role-based access for medical professionals
- Audit trail for all access and modifications
- Multi-factor authentication recommended

### 3. Data Retention

- 7-year retention for medical audit logs
- Automatic data purging after retention period
- Compliance with healthcare regulations

## Troubleshooting

### Common Issues

1. **Review Dashboard Not Loading**
   - Check DynamoDB table permissions
   - Verify SNS topic configuration
   - Check CloudWatch logs for errors

2. **Audit Logs Not Recording**
   - Verify KMS key permissions
   - Check DynamoDB table write permissions
   - Review CloudWatch logs for encryption errors

3. **PHI Redaction Issues**
   - Check PHI patterns configuration
   - Verify context detection accuracy
   - Review redaction strictness settings

### Support and Monitoring

- CloudWatch logs: `/aws/lambda/lifebridge-backend-prod-*`
- Audit logs: `/aws/lifebridge/audit-prod`
- SNS delivery status in CloudWatch metrics

For production deployment support, ensure your medical compliance officer reviews all configurations before going live with patient data.
