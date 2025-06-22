// Simple test script to verify Amazon Bedrock Nova Micro integration
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_ID = 'amazon.nova-micro-v1:0';

async function testNovaMicro() {
  try {
    console.log('Testing Amazon Nova Micro model...');
    
    // Test translation
    const prompt = `You are a professional medical translator. Please translate the following medical text from English to Spanish. 

Important guidelines:
- Provide only the translation without any explanation or additional text
- Maintain medical terminology accuracy
- Preserve the original meaning and context

Text to translate: "Hello, I need help with my medication"

Translation:`;

    const request = {
      modelId: MODEL_ID,
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
    const response = await client.send(command);
    
    if (response.body) {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Translation Response:', responseBody);
      
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
      
      console.log('Final Translation:', translatedText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testNovaMicro();
