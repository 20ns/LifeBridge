# LifeBridge Medical Translation - Test Suite

This directory contains organized test files for the LifeBridge medical translation platform, focusing on AWS Bedrock Nova Micro integration and medical context accuracy.

## 📁 Test Structure

```
tests/
├── backend/
│   ├── unit/                    # Direct AWS service testing
│   │   └── bedrock-nova-micro.test.js
│   └── services/                # Service layer testing
│       └── medical-context.test.js
├── integration/                 # Full application testing
│   └── app-integration.test.js
├── run-tests.js                # Test runner
└── README.md                   # This file
```

## 🚀 Quick Start

### Run All Tests
```bash
node tests/run-tests.js
```

### Run Specific Test Categories
```bash
# Unit tests (AWS Bedrock direct integration)
node tests/run-tests.js unit

# Service tests (Medical context translation)
node tests/run-tests.js services

# Integration tests (Full API endpoints)
node tests/run-tests.js integration
```

### Run Individual Tests
```bash
# Test Nova Micro integration directly
node tests/run-tests.js unit bedrock-nova-micro

# Test medical context service layer
node tests/run-tests.js services medical-context

# Test full application integration
node tests/run-tests.js integration app-integration
```

## 🧪 Test Categories

### 1. Unit Tests (`backend/unit/`)
- **bedrock-nova-micro.test.js**: Direct testing of Amazon Nova Micro model
  - Tests both EU (Stockholm) and US (East) regions  
  - Validates inference profile and direct model ID approaches
  - Medical translation accuracy verification

### 2. Service Tests (`backend/services/`)
- **medical-context.test.js**: Service layer medical translation testing
  - Medical context-aware translations
  - Language detection capabilities
  - Confidence scoring for medical terminology
  - Emergency, medication, consultation contexts

### 3. Integration Tests (`integration/`)
- **app-integration.test.js**: Full application API testing
  - Translation endpoint testing
  - Emergency phrases functionality
  - Language detection API
  - Text-to-speech integration
  - Complete workflow validation

## ⚙️ Prerequisites

### AWS Configuration
```bash
# Ensure AWS credentials are configured
aws configure list

# Verify access to Bedrock in eu-north-1
aws bedrock list-foundation-models --region eu-north-1
```

### Backend Setup
```bash
# Build the backend services
cd backend
npm install
npm run build
```

### Local Development Server
```bash
# Start backend for integration tests
cd backend
npm run dev

# The integration tests expect backend at: http://localhost:3001/dev
```

## 🔧 Environment Requirements

- **Node.js**: 18+ 
- **AWS CLI**: Configured with proper credentials
- **AWS Bedrock**: Access to Nova Micro model in eu-north-1
- **Backend Build**: Compiled TypeScript services (`npm run build`)

## 📊 Test Output

Each test provides detailed output including:
- ✅ Success indicators with translations
- ❌ Error messages with troubleshooting hints
- 📊 Confidence scores and quality metrics
- 🎯 Overall health assessment

### Sample Output
```
🧪 Testing Enhanced Medical Context Translations

📋 Testing: Emergency chest pain
   Source (en): "The patient has severe chest pain"
   Context: emergency
   ✅ Translation (es): "El paciente tiene dolor severo en el pecho"
   📊 Confidence: 92.5%

📊 Test Summary:
Translation Tests: 4/4 passed
Language Detection: 3/4 passed
Overall Status: ✅ PASS
```

## 🐛 Troubleshooting

### Common Issues

1. **"Compiled service not found"**
   ```bash
   cd backend && npm run build
   ```

2. **AWS Bedrock Access Denied**
   - Check IAM permissions for Bedrock
   - Verify model access in eu-north-1 region
   - Ensure inference profile permissions

3. **Integration Tests Failing**
   - Start backend server: `cd backend && npm run dev`
   - Check API endpoint: http://localhost:3001/dev/translate

4. **Language Detection Issues**
   - Service may fall back to simple word matching
   - Check Bedrock model availability

## 📝 Adding New Tests

### Unit Test Example
```javascript
// tests/backend/unit/new-feature.test.js
async function testNewFeature() {
  console.log('Testing new feature...');
  // Your test logic here
}

module.exports = { testNewFeature };
```

### Integration Test Example  
```javascript
// Add to app-integration.test.js
async testNewEndpoint() {
  const response = await fetch(`${this.baseUrl}/new-endpoint`);
  // Test logic here
}
```

## 🏥 Medical Context Focus

All tests prioritize medical translation accuracy:
- **Emergency scenarios**: Critical communication preservation
- **Medication instructions**: Dosage and timing accuracy  
- **Patient consultations**: Clear symptom communication
- **Medical terminology**: Professional vocabulary maintenance

## 📈 Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Automated AWS credential handling
- Detailed error reporting
- Exit codes for build systems
- Comprehensive logging

---

**Note**: This test suite was organized from scattered test files to provide a centralized, professional testing approach for the LifeBridge medical translation platform.
