const axios = require('axios');

const API_BASE_URL = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev';

async function testErrorHandling() {
  try {
    console.log('Testing error handling with invalid data...');
    
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

    console.log('Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('Error response received:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testErrorHandling();
