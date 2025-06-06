/**
 * LifeBridge Sign Language Backend Integration Test
 * Tests the deployed sign language processor Lambda function
 */

const axios = require('axios');

const API_BASE_URL = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev';

// Test data - simulated hand landmarks for different gestures
const testLandmarks = {
  emergency: Array.from({ length: 21 }, (_, i) => ({
    x: 0.5 + (Math.random() - 0.5) * 0.1,
    y: 0.5 + (Math.random() - 0.5) * 0.1,
    z: 0.01 + Math.random() * 0.02
  })),
  help: Array.from({ length: 21 }, (_, i) => ({
    x: 0.4 + (Math.random() - 0.5) * 0.1,
    y: 0.3 + (Math.random() - 0.5) * 0.1,
    z: 0.01 + Math.random() * 0.02
  })),
  pain: Array.from({ length: 21 }, (_, i) => ({
    x: 0.6 + (Math.random() - 0.5) * 0.1,
    y: 0.4 + (Math.random() - 0.5) * 0.1,
    z: 0.01 + Math.random() * 0.02
  }))
};

async function testSignLanguageBackend() {
  console.log('🤚 LifeBridge Sign Language Backend Test');
  console.log('==================================================');
  
  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Emergency gesture processing
  try {
    console.log('📡 Testing backend sign language processing...');
    
    const response = await axios.post(`${API_BASE_URL}/sign-language-process`, {
      landmarks: testLandmarks.emergency,
      gesture: 'emergency',
      confidence: 0.95,
      medicalContext: 'emergency',
      timestamp: Date.now()
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data.success) {
      console.log('  ✅ Backend processing successful');
      console.log(`  ✅ Response time: ${response.headers['x-response-time'] || 'N/A'}`);
      console.log(`  ✅ Enhanced gesture: ${response.data.data.enhancedGesture}`);
      console.log(`  ✅ Medical priority: ${response.data.data.medicalPriority}`);
      passed++;
    } else {
      console.log('  ❌ Backend processing failed');
      console.log(`  ❌ Status: ${response.status}`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ Backend request failed');
    console.log(`  ❌ Error: ${error.message}`);
    failed++;
  }

  // Test 2: Invalid data handling
  try {
    console.log('🔍 Testing error handling...');
    
    const response = await axios.post(`${API_BASE_URL}/sign-language-process`, {
      landmarks: [], // Invalid empty landmarks
      gesture: 'invalid',
      confidence: -1 // Invalid confidence
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    // Should return an error response
    if (response.status === 400 || (response.status === 200 && !response.data.success)) {
      console.log('  ✅ Error handling works correctly');
      passed++;
    } else {
      console.log('  ❌ Error handling failed - should reject invalid data');
      failed++;
    }
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      console.log('  ✅ Error handling works correctly (HTTP error)');
      passed++;
    } else {
      console.log('  ❌ Unexpected error in error handling test');
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
  }

  // Test 3: Performance test with multiple gestures
  try {
    console.log('⚡ Testing performance with multiple requests...');
    
    const startTime = Date.now();
    const promises = Object.entries(testLandmarks).map(([gesture, landmarks]) => 
      axios.post(`${API_BASE_URL}/sign-language-process`, {
        landmarks,
        gesture,
        confidence: 0.8 + Math.random() * 0.2,
        medicalContext: 'consultation',
        timestamp: Date.now()
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      })
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const allSuccessful = responses.every(r => r.status === 200 && r.data.success);
    const avgTime = (endTime - startTime) / responses.length;

    if (allSuccessful && avgTime < 2000) {
      console.log(`  ✅ Performance test passed`);
      console.log(`  ✅ Average response time: ${avgTime.toFixed(2)}ms`);
      console.log(`  ✅ All ${responses.length} requests successful`);
      passed++;
    } else {
      console.log('  ❌ Performance test failed');
      console.log(`  ❌ Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  ❌ Success rate: ${responses.filter(r => r.status === 200).length}/${responses.length}`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ Performance test failed');
    console.log(`  ❌ Error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('==================================================');
  console.log('📊 BACKEND TEST SUMMARY');
  console.log('==================================================');
  console.log(`  ✅ Tests passed: ${passed}`);
  console.log(`  ❌ Tests failed: ${failed}`);
  console.log(`  📊 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 All backend tests passed!');
    console.log('✅ Sign language backend is ready for production use');
  } else {
    console.log('⚠️  Some backend tests failed - review before production');
  }

  return failed === 0;
}

// Run the test
testSignLanguageBackend()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
