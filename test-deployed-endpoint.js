// Test the actual deployed Nova Micro endpoint
const https = require('https');

const testGestureData = {
    gestureName: "emergency",
    landmarks: [
        { x: 0.5, y: 0.3, z: 0.1 },
        { x: 0.6, y: 0.4, z: 0.12 },
        // ... simplified for test
    ],
    confidence: 0.9,
    timestamp: Date.now(),
    priority: "critical"
};

const postData = JSON.stringify(testGestureData);

const options = {
    hostname: 'sevmuborah.execute-api.eu-north-1.amazonaws.com',
    port: 443,
    path: '/prod/nova-sign-language',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('🧪 Testing deployed Nova Micro endpoint...');
console.log(`Endpoint: https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response:', data);
        
        if (res.statusCode === 200) {
            console.log('✅ SUCCESS - Nova Micro endpoint is working!');
        } else {
            console.log('❌ FAILED - Check the response above');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request Error:', error);
});

req.write(postData);
req.end();
