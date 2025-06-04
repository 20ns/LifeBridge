// Integration test script to verify LifeBridge medical translation functionality
const fetch = require('node-fetch');

class LifeBridgeIntegrationTests {
  constructor(baseUrl = 'http://localhost:3001/dev') {
    this.baseUrl = baseUrl;
    this.testResults = {
      translation: [],
      emergencyPhrases: null,
      languageDetection: [],
      textToSpeech: []
    };
  }

  async testMedicalTranslation() {
    console.log('🏥 Testing LifeBridge Medical Translation Integration...\n');
    
    const testCases = [
      {
        text: "Patient has severe chest pain and difficulty breathing",
        context: "emergency",
        sourceLanguage: "en",
        targetLanguage: "es",
        expectedKeywords: ["paciente", "dolor", "pecho"]
      },
      {
        text: "Please take two tablets twice daily with food",
        context: "medication", 
        sourceLanguage: "en",
        targetLanguage: "fr",
        expectedKeywords: ["comprimés", "fois", "jour"]
      },
      {
        text: "When did the symptoms start?",
        context: "consultation",
        sourceLanguage: "en", 
        targetLanguage: "de",
        expectedKeywords: ["symptome", "anfangen"]
      },
      {
        text: "The patient needs immediate medical attention",
        context: "general",
        sourceLanguage: "en",
        targetLanguage: "it",
        expectedKeywords: ["paziente", "medico", "immediato"]
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 Test ${i + 1}: ${testCase.context.toUpperCase()} Context`);
      console.log(`Original (${testCase.sourceLanguage}): "${testCase.text}"`);
      
      try {
        const response = await fetch(`${this.baseUrl}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: testCase.text,
            sourceLanguage: testCase.sourceLanguage,
            targetLanguage: testCase.targetLanguage,
            context: testCase.context
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log(`✅ Translation (${testCase.targetLanguage}): "${result.translatedText}"`);
          console.log(`🎯 Confidence: ${Math.round(result.confidence * 100)}%`);
          
          if (result.detectedLanguage) {
            console.log(`🔍 Detected Language: ${result.detectedLanguage}`);
          }
          
          // Check if translation contains expected keywords (basic quality check)
          const hasExpectedContent = testCase.expectedKeywords.some(keyword => 
            result.translatedText.toLowerCase().includes(keyword.toLowerCase())
          );
          
          this.testResults.translation.push({
            test: testCase.context,
            success: true,
            confidence: result.confidence,
            hasExpectedContent,
            translation: result.translatedText
          });
          
        } else {
          console.log(`❌ Error: ${result.error || 'Translation failed'}`);
          this.testResults.translation.push({
            test: testCase.context,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`❌ Network Error: ${error.message}`);
        this.testResults.translation.push({
          test: testCase.context,
          success: false,
          error: error.message
        });
      }
    }
  }

  async testEmergencyPhrases() {
    console.log('\n🚨 Testing Emergency Phrases...');
    
    try {
      const response = await fetch(`${this.baseUrl}/emergency-phrases?language=es&translate=true`);
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Emergency phrases loaded: ${result.phrases?.length || 0} phrases`);
        if (result.phrases && result.phrases.length > 0) {
          console.log('Sample phrases:');
          result.phrases.slice(0, 3).forEach((phrase, index) => {
            console.log(`   ${index + 1}. EN: "${phrase.english}"`);
            console.log(`      ES: "${phrase.translated || phrase.english}"`);
          });
        }
        
        this.testResults.emergencyPhrases = {
          success: true,
          count: result.phrases?.length || 0,
          translated: result.translated
        };
      } else {
        console.log('❌ Failed to load emergency phrases');
        this.testResults.emergencyPhrases = {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.log(`❌ Emergency phrases error: ${error.message}`);
      this.testResults.emergencyPhrases = {
        success: false,
        error: error.message
      };
    }
  }

  async testLanguageDetection() {
    console.log('\n🔍 Testing Language Detection...');
    
    const testTexts = [
      { text: "Tengo dolor en el pecho", expected: "es" },
      { text: "J'ai mal à la tête", expected: "fr" },
      { text: "Ich habe Bauchschmerzen", expected: "de" },
      { text: "I have a headache", expected: "en" }
    ];

    for (const testText of testTexts) {
      try {
        const response = await fetch(`${this.baseUrl}/detect-language`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: testText.text })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          const isCorrect = result.detectedLanguage === testText.expected;
          console.log(`   "${testText.text}"`);
          console.log(`   Expected: ${testText.expected} | Detected: ${result.detectedLanguage} ${isCorrect ? '✅' : '❌'}`);
          
          this.testResults.languageDetection.push({
            text: testText.text,
            expected: testText.expected,
            detected: result.detectedLanguage,
            correct: isCorrect
          });
        } else {
          console.log(`   ❌ Error detecting: "${testText.text}"`);
          this.testResults.languageDetection.push({
            text: testText.text,
            expected: testText.expected,
            detected: null,
            correct: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`   ❌ Network error for: "${testText.text}"`);
        this.testResults.languageDetection.push({
          text: testText.text,
          expected: testText.expected,
          detected: null,
          correct: false,
          error: error.message
        });
      }
    }
  }

  async testTextToSpeech() {
    console.log('\n🔊 Testing Text-to-Speech...');
    
    const testCases = [
      { text: "Hola, soy el doctor", language: "es" },
      { text: "Hello, I am the doctor", language: "en" }
    ];

    for (const testCase of testCases) {
      try {
        const response = await fetch(`${this.baseUrl}/text-to-speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: testCase.text, 
            language: testCase.language,
            outputFormat: 'mp3'
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log(`   ✅ TTS for "${testCase.text}" (${testCase.language})`);
          if (result.audioUrl) {
            console.log(`      Audio URL generated: ${result.audioUrl.substring(0, 50)}...`);
          }
          
          this.testResults.textToSpeech.push({
            text: testCase.text,
            language: testCase.language,
            success: true,
            hasAudioUrl: !!result.audioUrl
          });
        } else {
          console.log(`   ❌ TTS failed for "${testCase.text}"`);
          this.testResults.textToSpeech.push({
            text: testCase.text,
            language: testCase.language,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`   ❌ TTS network error for "${testCase.text}"`);
        this.testResults.textToSpeech.push({
          text: testCase.text,
          language: testCase.language,
          success: false,
          error: error.message
        });
      }
    }
  }

  generateTestReport() {
    console.log('\n📊 Integration Test Summary Report');
    console.log('=' .repeat(50));
    
    // Translation tests
    const translationPassed = this.testResults.translation.filter(t => t.success).length;
    const translationTotal = this.testResults.translation.length;
    console.log(`Translation Tests: ${translationPassed}/${translationTotal} passed`);
    
    // Emergency phrases
    const emergencyStatus = this.testResults.emergencyPhrases?.success ? 'PASS' : 'FAIL';
    console.log(`Emergency Phrases: ${emergencyStatus}`);
    
    // Language detection
    const detectionPassed = this.testResults.languageDetection.filter(t => t.correct).length;
    const detectionTotal = this.testResults.languageDetection.length;
    console.log(`Language Detection: ${detectionPassed}/${detectionTotal} passed`);
    
    // Text-to-speech
    const ttsPassed = this.testResults.textToSpeech.filter(t => t.success).length;
    const ttsTotal = this.testResults.textToSpeech.length;
    console.log(`Text-to-Speech: ${ttsPassed}/${ttsTotal} passed`);
    
    // Overall assessment
    const overallScore = (
      (translationPassed / translationTotal) * 0.4 +
      (this.testResults.emergencyPhrases?.success ? 1 : 0) * 0.2 +
      (detectionPassed / detectionTotal) * 0.2 +
      (ttsPassed / ttsTotal) * 0.2
    );
    
    console.log('\n🎯 Overall Integration Health:');
    if (overallScore >= 0.8) {
      console.log('🟢 EXCELLENT - System ready for production');
    } else if (overallScore >= 0.6) {
      console.log('🟡 GOOD - Minor issues to address');
    } else if (overallScore >= 0.4) {
      console.log('🟠 FAIR - Multiple issues need attention');
    } else {
      console.log('🔴 POOR - System requires significant fixes');
    }
    
    console.log(`Score: ${Math.round(overallScore * 100)}%`);
  }

  async runAllTests() {
    console.log('🧪 LifeBridge Integration Test Suite');
    console.log('Testing backend API endpoints and functionality\n');
    
    await this.testMedicalTranslation();
    await this.testEmergencyPhrases();
    await this.testLanguageDetection();
    await this.testTextToSpeech();
    
    this.generateTestReport();
    
    console.log('\n💡 Next Steps:');
    console.log('- Frontend: http://localhost:3000');
    console.log('- Backend API: http://localhost:3001');
    console.log('- Manual testing: Open frontend/public/test-backend.html');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new LifeBridgeIntegrationTests();
  tester.runAllTests().catch(console.error);
}

module.exports = { LifeBridgeIntegrationTests };
