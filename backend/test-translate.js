// Simple test script to verify Amazon Translate integration
const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');
const { ComprehendClient, DetectDominantLanguageCommand } = require('@aws-sdk/client-comprehend');

const translateClient = new TranslateClient({ region: 'us-east-1' });
const comprehendClient = new ComprehendClient({ region: 'us-east-1' });

async function testTranslation() {
  try {
    console.log('Testing Amazon Translate...');
    
    // Test translation
    const translateCommand = new TranslateTextCommand({
      Text: 'Hello, I need help with my medication',
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'es'
    });
    
    const translateResponse = await translateClient.send(translateCommand);
    console.log('Translation successful:', translateResponse.TranslatedText);
    
    // Test language detection
    const detectCommand = new DetectDominantLanguageCommand({
      Text: 'Hello, I need help with my medication'
    });
    
    const detectResponse = await comprehendClient.send(detectCommand);
    if (detectResponse.Languages && detectResponse.Languages.length > 0) {
      console.log('Language detection successful:', detectResponse.Languages[0]);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testTranslation();
