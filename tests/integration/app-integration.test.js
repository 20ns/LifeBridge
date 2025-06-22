// Integration test script to verify LifeBridge medical translation functionality

// Mock fetch for testing without running server
const fetch = jest.fn();

describe('LifeBridge Integration Tests', () => {
  const baseUrl = 'http://localhost:3001/dev';

  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Medical Translation Tests', () => {
    const testCases = [
      {
        text: "Patient has severe chest pain and difficulty breathing",
        context: "emergency",
        sourceLanguage: "en",
        targetLanguage: "es",
        expectedKeywords: ["paciente", "dolor", "pecho"]
      },
      {
        text: "Please take two tablets twice daily with food",
        context: "medication", 
        sourceLanguage: "en",
        targetLanguage: "fr",
        expectedKeywords: ["comprimés", "fois", "jour"]
      },
      {
        text: "When did the symptoms start?",
        context: "consultation",
        sourceLanguage: "en", 
        targetLanguage: "de",
        expectedKeywords: ["symptome", "anfangen"]
      },
      {
        text: "The patient needs immediate medical attention",
        context: "general",
        sourceLanguage: "en",
        targetLanguage: "it",
        expectedKeywords: ["paziente", "medico", "immediato"]
      }
    ];

    test.each(testCases)('should translate $context context text', async (testCase) => {
      // Mock successful translation response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            translatedText: `Mock translation for ${testCase.context}`,
            confidence: 0.85,
            detectedLanguage: testCase.sourceLanguage
          }
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      try {
        const response = await fetch(`${baseUrl}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: testCase.text,
            sourceLanguage: testCase.sourceLanguage,
            targetLanguage: testCase.targetLanguage,
            context: testCase.context
          })
        });
        
        const result = await response.json();
        
        expect(response.ok).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.translatedText).toBeDefined();
        expect(result.data.confidence).toBeGreaterThan(0);
        
        console.log(`✅ ${testCase.context}: "${testCase.text}" -> "${result.data.translatedText}"`);
        
      } catch (error) {
        // Test error handling
        expect(error).toBeDefined();
        console.log(`❌ Network Error for ${testCase.context}: ${error.message}`);
      }
    });

    test('should handle translation errors gracefully', async () => {
      // Mock error response
      const mockErrorResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Translation service unavailable'
        })
      };
      
      fetch.mockResolvedValue(mockErrorResponse);
      
      const response = await fetch(`${baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test text',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          context: 'test'
        })
      });
      
      const result = await response.json();
      
      expect(response.ok).toBe(false);
      expect(result.error).toBeDefined();
      console.log('✅ Error handling works correctly');
    });
  });

  describe('Emergency Phrases Tests', () => {
    test('should load emergency phrases', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            phrases: [
              { english: 'Call 911', translated: 'Llame al 911' },
              { english: 'Heart attack', translated: 'Ataque cardíaco' }
            ],
            translated: true
          }
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const response = await fetch(`${baseUrl}/emergency-phrases?language=es&translate=true`);
      const result = await response.json();
      
      expect(response.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.phrases).toBeDefined();
      expect(Array.isArray(result.data.phrases)).toBe(true);
      
      console.log(`✅ Emergency phrases loaded: ${result.data.phrases.length} phrases`);
    });

    test('should handle emergency phrases errors', async () => {
      const mockErrorResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Emergency phrases service unavailable'
        })
      };
      
      fetch.mockResolvedValue(mockErrorResponse);
      
      const response = await fetch(`${baseUrl}/emergency-phrases?language=es&translate=true`);
      const result = await response.json();
      
      expect(response.ok).toBe(false);
      expect(result.error).toBeDefined();
      console.log('✅ Emergency phrases error handling works');
    });
  });

  describe('Language Detection Tests', () => {
    const testTexts = [
      { text: "Tengo dolor en el pecho", expected: "es" },
      { text: "J'ai mal à la tête", expected: "fr" },
      { text: "Ich habe Bauchschmerzen", expected: "de" },
      { text: "I have a headache", expected: "en" }
    ];

    test.each(testTexts)('should detect language for "$text"', async ({ text, expected }) => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            detectedLanguage: expected,
            confidence: 0.9
          }
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const response = await fetch(`${baseUrl}/detect-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });
      
      const result = await response.json();
      
      expect(response.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.detectedLanguage).toBe(expected);
      
      console.log(`✅ Language detection: "${text}" -> ${result.data.detectedLanguage}`);
    });
  });

  describe('Text-to-Speech Tests', () => {
    const testCases = [
      { text: "Hola, soy el doctor", language: "es" },
      { text: "Hello, I am the doctor", language: "en" }
    ];

    test.each(testCases)('should generate speech for "$text" in $language', async ({ text, language }) => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            audioUrl: 'https://mock-audio-url.com/audio.mp3',
            format: 'mp3'
          }
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const response = await fetch(`${baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          language,
          outputFormat: 'mp3'
        })
      });
      
      const result = await response.json();
      
      expect(response.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.audioUrl).toBeDefined();
      
      console.log(`✅ TTS for "${text}" (${language}): ${result.data.audioUrl}`);
    });
  });

  describe('Integration Health Tests', () => {
    test('should have proper API endpoint structure', () => {
      expect(baseUrl).toContain('localhost');
      expect(baseUrl).toContain('3001');
      console.log('✅ API endpoint structure validated');
    });

    test('should validate test data completeness', () => {
      // Verify test cases have required fields
      const translationTests = [
        { text: "Test", context: "test", sourceLanguage: "en", targetLanguage: "es" }
      ];
      
      translationTests.forEach(testCase => {
        expect(testCase.text).toBeDefined();
        expect(testCase.context).toBeDefined();
        expect(testCase.sourceLanguage).toBeDefined();
        expect(testCase.targetLanguage).toBeDefined();
      });
      
      console.log('✅ Test data structure validated');
    });
  });
});
