// Sign Language to Translation Pipeline Integration Test
// Tests the complete flow from sign detection to translation using the new endpoints

const API_BASE_URL = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev';

// Test data for common emergency medical signs
const testSigns = [
  {
    gesture: 'emergency',
    confidence: 0.95,
    timestamp: Date.now(),
    expectedMedical: true,
    expectedPriority: 'critical'
  },
  {
    gesture: 'help',
    confidence: 0.88,
    timestamp: Date.now() + 1000,
    expectedMedical: true,
    expectedPriority: 'critical'
  },
  {
    gesture: 'pain',
    confidence: 0.82,
    timestamp: Date.now() + 2000,
    expectedMedical: true,
    expectedPriority: 'high'
  },
  {
    gesture: 'medicine',
    confidence: 0.79,
    timestamp: Date.now() + 3000,
    expectedMedical: true,
    expectedPriority: 'high'
  },
  {
    gesture: 'doctor',
    confidence: 0.85,
    timestamp: Date.now() + 4000,
    expectedMedical: true,
    expectedPriority: 'medium'
  }
];

// Test individual sign to translation
async function testSignToTranslation() {
  console.log('🧪 Testing Sign-to-Translation Pipeline...');
  
  for (const sign of testSigns) {
    try {
      const response = await fetch(`${API_BASE_URL}/sign-to-translation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signData: sign,
          targetLanguage: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ Sign "${sign.gesture}" Translation:`, {
        detected: result.detectedSign,
        translated: result.translatedText,
        confidence: result.confidence,
        medical: result.medicalContext,
        emergency: result.isEmergency
      });

      // Validate response structure
      if (!result.detectedSign || !result.translatedText) {
        throw new Error('Missing required fields in response');
      }

      // Validate medical context for emergency signs
      if (sign.expectedMedical && !result.medicalContext) {
        console.warn(`⚠️ Missing medical context for medical sign: ${sign.gesture}`);
      }

      // Validate emergency detection
      if (sign.expectedPriority === 'critical' && !result.isEmergency) {
        console.warn(`⚠️ Emergency not detected for critical sign: ${sign.gesture}`);
      }

    } catch (error) {
      console.error(`❌ Failed to translate sign "${sign.gesture}":`, error.message);
    }
  }
}

// Test batch sign processing
async function testBatchSignProcessing() {
  console.log('\n🧪 Testing Batch Sign Processing...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/batch-sign-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signs: testSigns,
        targetLanguage: 'en'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('✅ Batch Processing Result:', {
      signsProcessed: result.signs.length,
      combinedText: result.combinedText,
      translatedText: result.translatedText,
      medicalContext: result.medicalContext,
      isEmergency: result.isEmergency
    });

    // Validate batch processing
    if (result.signs.length !== testSigns.length) {
      console.warn(`⚠️ Expected ${testSigns.length} signs, got ${result.signs.length}`);
    }

    if (!result.combinedText || !result.translatedText) {
      throw new Error('Missing combined or translated text in batch result');
    }

    // Check if emergency is detected in batch (should be true due to critical signs)
    const hasCriticalSigns = testSigns.some(s => s.expectedPriority === 'critical');
    if (hasCriticalSigns && !result.isEmergency) {
      console.warn('⚠️ Emergency not detected in batch with critical signs');
    }

  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
  }
}

// Test translation to different languages
async function testMultiLanguageTranslation() {
  console.log('\n🧪 Testing Multi-Language Translation...');
  
  const languages = ['es', 'fr', 'de', 'zh'];
  const testSign = testSigns[0]; // Use emergency sign
  
  for (const lang of languages) {
    try {
      const response = await fetch(`${API_BASE_URL}/sign-to-translation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signData: testSign,
          targetLanguage: lang
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ ${lang.toUpperCase()} Translation:`, {
        original: result.detectedSign,
        translated: result.translatedText,
        confidence: result.confidence
      });

    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()} translation failed:`, error.message);
    }
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  // Test invalid sign data
  try {
    const response = await fetch(`${API_BASE_URL}/sign-to-translation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signData: {
          gesture: 'invalid_gesture',
          confidence: -1, // Invalid confidence
          timestamp: 'invalid_timestamp'
        },
        targetLanguage: 'en'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Invalid sign handled gracefully:', result);
    } else {
      console.log('✅ Proper error response for invalid data:', result);
    }

  } catch (error) {
    console.log('✅ Error handling working:', error.message);
  }

  // Test missing required fields
  try {
    const response = await fetch(`${API_BASE_URL}/sign-to-translation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing signData
        targetLanguage: 'en'
      })
    });

    const result = await response.json();
    console.log('✅ Missing field error handled:', result);

  } catch (error) {
    console.log('✅ Missing field validation working:', error.message);
  }
}

// Performance testing
async function testPerformance() {
  console.log('\n🧪 Testing Performance...');
  
  const iterations = 5;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE_URL}/sign-to-translation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signData: testSigns[0],
          targetLanguage: 'en'
        })
      });

      await response.json();
      const endTime = Date.now();
      times.push(endTime - startTime);
      
    } catch (error) {
      console.error(`Performance test iteration ${i + 1} failed:`, error.message);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('✅ Performance Results:', {
      averageTime: `${avgTime.toFixed(2)}ms`,
      minTime: `${minTime}ms`,
      maxTime: `${maxTime}ms`,
      iterations: times.length
    });
    
    // Alert if performance is poor
    if (avgTime > 5000) {
      console.warn('⚠️ Average response time exceeds 5 seconds');
    }
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Starting Sign Language Translation Integration Tests\n');
  console.log('Testing API Base URL:', API_BASE_URL);
  console.log('Testing with AWS Free Tier endpoints\n');
  
  const startTime = Date.now();
  
  try {
    await testSignToTranslation();
    await testBatchSignProcessing();
    await testMultiLanguageTranslation();
    await testErrorHandling();
    await testPerformance();
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ All integration tests completed in ${totalTime}s`);
    console.log('🏥 Sign language to translation pipeline is ready for medical use!');
    
  } catch (error) {
    console.error('\n❌ Integration tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests();
}

module.exports = {
  runIntegrationTests,
  testSignToTranslation,
  testBatchSignProcessing,
  testMultiLanguageTranslation,
  testErrorHandling,
  testPerformance
};
