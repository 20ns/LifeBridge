// Test script to verify criticality scoring fix
const https = require('https');

const testPhrase = "I have a heart attack";
const API_URL = "https://sevmuborah.execute-api.eu-north-1.amazonaws.com/prod/translate";

const payload = JSON.stringify({
  text: testPhrase,
  sourceLanguage: "en",
  targetLanguage: "es",
  context: "emergency"
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

console.log(`🧪 Testing criticality scoring for: "${testPhrase}"`);
console.log(`🔗 API Endpoint: ${API_URL}`);
console.log('─'.repeat(50));

const req = https.request(API_URL, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📈 Success: ${response.success}`);
      
      if (response.data) {
        console.log(`🔤 Translation: "${response.data.translatedText}"`);
        console.log(`🎯 Confidence: ${response.data.confidence}`);
        
        if (response.data.medicalAnalysis) {
          const analysis = response.data.medicalAnalysis;
          console.log('\n🏥 Medical Analysis:');
          console.log(`   Contains Medical: ${analysis.containsMedical}`);
          console.log(`   Is Emergency: ${analysis.isEmergency}`);
          console.log(`   🚨 Criticality Score: ${analysis.criticalityScore}/100`);
          console.log(`   Recommended Context: ${analysis.recommendedContext}`);
          
          if (analysis.detectedTerms && analysis.detectedTerms.length > 0) {
            console.log('   Detected Terms:');
            analysis.detectedTerms.forEach(term => {
              console.log(`     - ${term.term} (${term.category}, ${term.criticality})`);
            });
          }
          
          // Check if fix is working
          if (analysis.criticalityScore > 0) {
            console.log('\n✅ SUCCESS: Criticality scoring is working!');
            console.log(`✅ Heart attack phrase correctly scored: ${analysis.criticalityScore}/100`);
          } else {
            console.log('\n❌ ISSUE: Criticality score is still 0');
          }
        } else {
          console.log('\n❌ ISSUE: No medical analysis in response');
        }
      } else {
        console.log('\n❌ ISSUE: No data in response');
        console.log('Response:', JSON.stringify(response, null, 2));
      }
      
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(payload);
req.end();
