// @ts-nocheck
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { translateText, detectLanguage } from '../../../backend/src/services/bedrock';

const bedrockMock = mockClient(BedrockRuntimeClient);

describe('Bedrock service', () => {
  beforeEach(() => bedrockMock.reset());

  it('should return translated text from Bedrock', async () => {
    const responseBody = {
      output: {
        message: {
          content: [{ text: 'Hola mundo' }],
        },
      },
    };

    bedrockMock.on(InvokeModelCommand).resolves({
      body: Buffer.from(JSON.stringify(responseBody)),
    } as any);

    const result = await translateText('Hello world', 'en', 'es');
    expect(result.translatedText).toBe('Hola mundo');
    expect(result.sourceLanguage).toBe('en');
    expect(result.targetLanguage).toBe('es');
  });

  it('should detect language code', async () => {
    const responseBody = {
      output: {
        message: {
          content: [{ text: 'es' }],
        },
      },
    };

    bedrockMock.on(InvokeModelCommand).resolves({
      body: Buffer.from(JSON.stringify(responseBody)),
    } as any);

    const code = await detectLanguage('Hola mundo');
    expect(code).toBe('es');
  });
}); 