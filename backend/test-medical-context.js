// Test script for medical context translation
const { translateText, detectLanguage } = require('./dist/services/bedrock');

async function testMedicalTranslations() {
  console.log('🧪 Testing Enhanced Medical Context Translations with Nova Micro\n');

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
    }
  ];

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
      console.log(`   📊 Confidence: ${result.confidence}`);
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }

  // Test language detection
  console.log('🔍 Testing Language Detection:\n');
  
  const languageTests = [
    "Tengo dolor en el pecho",
    "J'ai mal à la tête",
    "Ich habe Bauchschmerzen",
    "我头疼"
  ];

  for (const text of languageTests) {
    try {
      const detected = await detectLanguage(text);
      console.log(`   Text: "${text}" → Detected: ${detected}`);
    } catch (error) {
      console.log(`   Error detecting language for "${text}": ${error.message}`);
    }
  }
}

// Run the tests
testMedicalTranslations().catch(console.error);
