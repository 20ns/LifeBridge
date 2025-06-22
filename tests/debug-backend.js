const axios = require('axios');

const API_BASE_URL = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev';

async function debugResponse() {
  try {
    const response = await axios.post(`${API_BASE_URL}/sign-language-process`, {
      landmarks: Array.from({ length: 21 }, (_, i) => ({
        x: 0.5 + (Math.random() - 0.5) * 0.1,
        y: 0.5 + (Math.random() - 0.5) * 0.1,
        z: 0.01 + Math.random() * 0.02
      })),
      gesture: 'emergency',
      confidence: 0.95,
      medicalContext: 'emergency',
      timestamp: Date.now()
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Full response structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugResponse();
