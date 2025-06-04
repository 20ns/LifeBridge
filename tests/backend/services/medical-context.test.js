// Test script for medical context translation using the service layer
const path = require('path');

// Try to import the compiled service or fall back to direct testing
let translateText, detectLanguage;

try {
  // First try to import from compiled dist
  const bedrockService = require('../../backend/dist/services/bedrock');
  translateText = bedrockService.translateText;
  detectLanguage = bedrockService.detectLanguage;
} catch (error) {
  console.log('⚠️  Compiled service not found, ensure backend is built with: npm run build');
  console.log('Falling back to direct Bedrock testing...');
  
  // Fallback to direct Bedrock testing
  const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
  const client = new BedrockRuntimeClient({ region: 'eu-north-1' });
  
  // Simplified fallback implementation
  translateText = async (text, source, target, context) => {
    const prompt = `You are a professional medical translator. Please translate the following medical text from ${source} to ${target}.

Medical Context: ${context || 'general'}

Important guidelines:
- Maintain medical terminology accuracy
- Preserve urgency and tone for emergency situations  
- Use culturally appropriate medical language
- Ensure clarity for healthcare communication

Text to translate: "${text}"

Please provide only the translation without explanations or additional text.`;

    const command = new InvokeModelCommand({
      modelId: 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [{ role: 'user', content: [{ text: prompt }] }]
      })
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const translatedText = responseBody.output.message.content[0].text.trim();
    
    return {
      translatedText,
      confidence: 0.8, // Default confidence
      sourceLanguage: source,
      targetLanguage: target
    };
  };
  
  detectLanguage = async (text) => {
    // Simplified language detection
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'está', 'todo', 'más'];
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'];
    const germanWords = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'];
    
    const lowerText = text.toLowerCase();
    const spanishCount = spanishWords.filter(word => lowerText.includes(word)).length;
    const frenchCount = frenchWords.filter(word => lowerText.includes(word)).length;
    const germanCount = germanWords.filter(word => lowerText.includes(word)).length;
    
    if (spanishCount > frenchCount && spanishCount > germanCount) return 'es';
    if (frenchCount > germanCount) return 'fr';
    if (germanCount > 0) return 'de';
    return 'en';
  };
}

async function testMedicalTranslations() {
  console.log('🧪 Testing Enhanced Medical Context Translations\n');

  const testCases = [
    {
      text: "The patient has severe chest pain",
      source: "en",
      target: "es",
      context: "emergency",
      description: "Emergency chest pain"
    },
    {
      text: "Take two tablets twice daily with food",
      source: "en", 
      target: "fr",
      context: "medication",
      description: "Medication instructions"
    },
    {
      text: "How long have you been experiencing these symptoms?",
      source: "en",
      target: "de", 
      context: "consultation",
      description: "Patient consultation"
    },
    {
      text: "Call an ambulance immediately",
      source: "en",
      target: "zh",
      context: "emergency",
      description: "Emergency call (with fallback test)"
    },
    {
      text: "Please rate your pain from 1 to 10",
      source: "en",
      target: "pt",
      context: "assessment",
      description: "Pain assessment"
    }
  ];

  let passedTests = 0;
  const totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`📋 Testing: ${testCase.description}`);
      console.log(`   Source (${testCase.source}): "${testCase.text}"`);
      console.log(`   Context: ${testCase.context}`);
      
      const result = await translateText(
        testCase.text, 
        testCase.source, 
        testCase.target,
        testCase.context
      );
      
      console.log(`   ✅ Translation (${testCase.target}): "${result.translatedText}"`);
      console.log(`   📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log('');
      passedTests++;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }

  // Test language detection
  console.log('🔍 Testing Language Detection:\n');
  
  const languageTests = [
    { text: "Tengo dolor en el pecho", expected: "es" },
    { text: "J'ai mal à la tête", expected: "fr" },
    { text: "Ich habe Bauchschmerzen", expected: "de" },
    { text: "I have a headache", expected: "en" }
  ];

  let detectionPassed = 0;

  for (const test of languageTests) {
    try {
      const detected = await detectLanguage(test.text);
      const isCorrect = detected === test.expected;
      console.log(`   Text: "${test.text}"`);
      console.log(`   Expected: ${test.expected} | Detected: ${detected} ${isCorrect ? '✅' : '❌'}`);
      if (isCorrect) detectionPassed++;
    } catch (error) {
      console.log(`   ❌ Error detecting language for "${test.text}": ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`Translation Tests: ${passedTests}/${totalTests} passed`);
  console.log(`Language Detection: ${detectionPassed}/${languageTests.length} passed`);
  
  const overallSuccess = (passedTests / totalTests) > 0.7 && (detectionPassed / languageTests.length) > 0.5;
  console.log(`Overall Status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!overallSuccess) {
    console.log('\n💡 Troubleshooting tips:');
    console.log('- Ensure backend is built: cd backend && npm run build');
    console.log('- Check AWS credentials and permissions');
    console.log('- Verify Bedrock model access in eu-north-1 region');
  }
}

// Run the tests
if (require.main === module) {
  testMedicalTranslations().catch(console.error);
}

module.exports = { 
  testMedicalTranslations,
  runMedicalContextTests: testMedicalTranslations 
};
