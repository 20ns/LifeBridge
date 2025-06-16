const https = require('https');

const endpoint = 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev/gesture-recognition-ml';
const testPayload = JSON.stringify({
  landmarks: [[0.5, 0.5, 0.5], [0.6, 0.6, 0.6], [0.7, 0.7, 0.7]]
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testPayload.length
  }
};

console.log('🔬 Testing Sign Language ML Endpoint...');
console.log('🎯 Endpoint:', endpoint);

const req = https.request(endpoint, options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📊 Response:', JSON.stringify(response, null, 2));
      
      if (response.description && response.description.includes('Fallback mode')) {
        console.log('⚠️  Still in fallback mode - ML dependencies may still be missing');
      } else {
        console.log('✅ ML dependencies working - real model response received!');
      }
    } catch (err) {
      console.error('❌ Error parsing response:', err);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err);
});

req.write(testPayload);
req.end();
