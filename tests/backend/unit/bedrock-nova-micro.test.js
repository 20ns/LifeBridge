// Test script for Amazon Nova Micro integration and translation functionality
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Test both direct Bedrock integration and service layer
function createNovaMicroTests() {
  const euClient = new BedrockRuntimeClient({ region: 'eu-north-1' });
  const usClient = new BedrockRuntimeClient({ region: 'us-east-1' });
  
  const EU_MODEL_ID = 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0';
  const US_MODEL_ID = 'amazon.nova-micro-v1:0';

  // Test EU region with inference profile
  async function testEURegionNovaMicro() {
    console.log('\n🇪🇺 Testing EU Region (Stockholm) with Inference Profile...');
    
    const prompt = `You are a professional medical translator. Please translate the following medical text from English to Spanish. 

Important guidelines:
- Provide only the translation without any explanation or additional text
- Maintain medical terminology accuracy
- Preserve the original meaning and context
- Keep the same tone and urgency level

Text to translate: "Hello, I need help with my medication"

Translation:`;

    try {
      const request = {
        modelId: EU_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      };

      const command = new InvokeModelCommand(request);
      const response = await euClient.send(command);
      
      if (response.body) {
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        console.log('✅ EU Nova Micro Response received');
        
        if (responseBody.output && responseBody.output.message && responseBody.output.message.content && responseBody.output.message.content[0]) {
          console.log('✅ Translation successful:', responseBody.output.message.content[0].text);
          return true;
        } else {
          console.log('❌ Unexpected response format');
          console.log('Response:', responseBody);
          return false;
        }
      }
    } catch (error) {
      console.error('❌ EU Test failed:', error.message);
      return false;
    }
  }

  // Test US region with direct model ID
  async function testUSRegionNovaMicro() {
    console.log('\n🇺🇸 Testing US Region with Direct Model ID...');
    
    const prompt = `You are a professional medical translator. Please translate the following medical text from English to Spanish. 

Important guidelines:
- Provide only the translation without any explanation or additional text
- Maintain medical terminology accuracy
- Preserve the original meaning and context

Text to translate: "Hello, I need help with my medication"

Translation:`;

    try {
      const request = {
        modelId: US_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt,
          maxTokens: 1000,
          temperature: 0.1,
          topP: 0.9
        })
      };

      const command = new InvokeModelCommand(request);
      const response = await usClient.send(command);
      
      if (response.body) {
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        console.log('✅ US Nova Micro Response received');
        
        let translatedText = '';
        if (responseBody.completion) {
          translatedText = responseBody.completion.trim();
        } else if (responseBody.outputs && responseBody.outputs[0]) {
          translatedText = responseBody.outputs[0].text.trim();
        } else if (responseBody.response) {
          translatedText = responseBody.response.trim();
        }
        
        // Clean up the translation
        if (translatedText.toLowerCase().startsWith('translation:')) {
          translatedText = translatedText.substring(12).trim();
        }
        
        console.log('✅ Final Translation:', translatedText);
        return true;
      }
    } catch (error) {
      console.error('❌ US Test failed:', error.message);
      return false;
    }
  }

  // Run all tests
  async function runTests() {
    console.log('🧪 Testing Amazon Nova Micro Integration Across Regions\n');
    
    const results = {
      eu: await testEURegionNovaMicro(),
      us: await testUSRegionNovaMicro()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log(`EU Region (Stockholm): ${results.eu ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`US Region (East): ${results.us ? '✅ PASS' : '❌ FAIL'}`);
    
    if (results.eu || results.us) {
      console.log('\n🎉 At least one region is working! The application can proceed.');
    } else {
      console.log('\n⚠️  Both regions failed. Check AWS credentials and model access.');
    }
  }
  return { runTests };
}

// Export for use as a module or run directly
if (require.main === module) {
  const tests = createNovaMicroTests();
  tests.runTests();
}

module.exports = { testNovaMicroIntegration: createNovaMicroTests };
