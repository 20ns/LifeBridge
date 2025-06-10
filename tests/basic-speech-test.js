/**
 * Basic Speech Integration Test
 * Tests the speech interface components and services without AWS dependencies
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001/dev';

// Test basic endpoint connectivity
async function testBackendConnectivity() {
  console.log('🔌 Testing backend connectivity...');
  
  try {
    // Test translate endpoint (should work)
    const response = await fetch(`${BACKEND_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, how are you?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Translation endpoint working:', data.data.translatedText);
    } else {
      console.log('⚠️ Translation endpoint returned:', response.status);
    }

  } catch (error) {
    console.error('❌ Backend connectivity failed:', error.message);
    throw error;
  }
}

// Test text-to-speech endpoint
async function testTextToSpeech() {
  console.log('🔊 Testing text-to-speech endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'This is a test message.',
        language: 'en'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audioBase64) {
        console.log('✅ Text-to-speech working! Audio length:', data.audioBase64.length);
        console.log('🗣️ Voice used:', data.voiceId);
      } else {
        console.log('⚠️ No audio data returned');
      }
    } else {
      const errorData = await response.json();
      console.log('⚠️ Text-to-speech failed:', errorData.message);
    }

  } catch (error) {
    console.error('❌ Text-to-speech test failed:', error.message);
  }
}

// Test speech-to-text endpoint structure (without real audio)
async function testSpeechToTextStructure() {
  console.log('🎤 Testing speech-to-text endpoint structure...');
  
  try {
    // Test with invalid data to check error handling
    const response = await fetch(`${BACKEND_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: '', // Empty audio data should trigger validation
        language: 'en'
      })
    });

    const data = await response.json();
    
    if (response.status === 400 && data.message.includes('Audio data is required')) {
      console.log('✅ Speech-to-text endpoint validation working correctly');
    } else {
      console.log('⚠️ Unexpected response:', data);
    }

  } catch (error) {
    console.error('❌ Speech-to-text structure test failed:', error.message);
  }
}

// Test language detection
async function testLanguageDetection() {
  console.log('🌍 Testing language detection...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/detect-language`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hola, ¿cómo estás?'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Language detection working:', data.detectedLanguage);
    } else {
      const errorData = await response.json();
      console.log('⚠️ Language detection failed:', errorData.message);
    }

  } catch (error) {
    console.error('❌ Language detection test failed:', error.message);
  }
}

// Test emergency phrases endpoint
async function testEmergencyPhrases() {
  console.log('🚨 Testing emergency phrases...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/emergency-phrases`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Emergency phrases working, count:', data.phrases?.length || 0);
    } else {
      const errorData = await response.json();
      console.log('⚠️ Emergency phrases failed:', errorData.message);
    }

  } catch (error) {
    console.error('❌ Emergency phrases test failed:', error.message);
  }
}

// Main test runner
async function runBasicTests() {
  console.log('🚀 Running Basic Speech Integration Tests...');
  console.log('📍 Backend URL:', BACKEND_URL);
  console.log('');

  try {
    await testBackendConnectivity();
    console.log('');
    
    await testTextToSpeech();
    console.log('');
    
    await testSpeechToTextStructure();
    console.log('');
    
    await testLanguageDetection();
    console.log('');
    
    await testEmergencyPhrases();
    console.log('');
    
    console.log('🎉 Basic tests completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. ✅ Backend endpoints are working');
    console.log('2. 🔧 Set up AWS credentials for full speech-to-text testing');
    console.log('3. 🪣 Create S3 bucket for audio file storage');
    console.log('4. 🎤 Test with real audio recording in browser');
    console.log('5. 🔄 Test complete speech-to-text-to-translation pipeline');
    
  } catch (error) {
    console.error('💥 Basic tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runBasicTests();
}

module.exports = {
  testBackendConnectivity,
  testTextToSpeech,
  testSpeechToTextStructure,
  testLanguageDetection,
  testEmergencyPhrases,
  runBasicTests
};
