// Simple test script to verify Amazon Nova Micro integration
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: 'eu-north-1' });
const MODEL_ID = 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0';

async function testNovaMicro() {
  try {
    console.log('Testing Amazon Nova Micro...');
    
    // Test translation
    const prompt = `You are a professional medical translator. Please translate the following medical text from English to Spanish. 

Important guidelines:
- Provide only the translation without any explanation or additional text
- Maintain medical terminology accuracy
- Preserve the original meaning and context
- Keep the same tone and urgency level

Text to translate: "Hello, I need help with my medication"

Translation:`;

    const request = {
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',      body: JSON.stringify({
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
    const response = await client.send(command);
      if (response.body) {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Nova Micro Response:', responseBody);
      
      if (responseBody.output && responseBody.output.message && responseBody.output.message.content && responseBody.output.message.content[0]) {
        console.log('Translation successful:', responseBody.output.message.content[0].text);
      } else {
        console.log('Unexpected response format');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testNovaMicro();
