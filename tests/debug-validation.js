/**
 * Debug script to test validation specifically
 */

const axios = require('axios');

const API_BASE_URL = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev';

async function testValidation() {
  console.log('🔍 Debug Validation Test');
  console.log('==========================');

  // Test with invalid data that should be rejected
  try {
    console.log('📤 Sending invalid request with:');
    console.log('  - landmarks: [] (empty array)');
    console.log('  - confidence: -1 (invalid range)');
    console.log('  - gesture: "invalid"');
    
    const response = await axios.post(`${API_BASE_URL}/sign-language-process`, {
      landmarks: [], // Should fail validation
      gesture: 'invalid',
      confidence: -1 // Should fail validation
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('📥 Response received:');
    console.log(`  Status: ${response.status}`);
    console.log(`  Success: ${response.data.success}`);
    console.log(`  Message: ${response.data.message || 'N/A'}`);
    console.log(`  Error: ${response.data.error || 'N/A'}`);
    console.log('  Full response:', JSON.stringify(response.data, null, 2));

    if (response.status === 400 || (response.status === 200 && !response.data.success)) {
      console.log('✅ Validation working correctly - rejected invalid data');
    } else {
      console.log('❌ Validation NOT working - accepted invalid data');
    }

  } catch (error) {
    if (error.response) {
      console.log('📥 Error response received:');
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status >= 400) {
        console.log('✅ Validation working correctly - returned HTTP error');
      }
    } else {
      console.log('❌ Network or other error:', error.message);
    }
  }
}

testValidation();
