// Test script to verify LifeBridge medical translation functionality
const fetch = require('node-fetch');

async function testMedicalTranslation() {
    console.log('🏥 Testing LifeBridge Medical Translation...\n');
    
    const baseUrl = 'http://localhost:3001/dev';
    
    // Test cases with different medical contexts
    const testCases = [
        {
            text: "Patient has severe chest pain and difficulty breathing",
            context: "emergency",
            sourceLanguage: "en-US",
            targetLanguage: "es-ES"
        },
        {
            text: "Please take two tablets twice daily with food",
            context: "medication", 
            sourceLanguage: "en-US",
            targetLanguage: "fr-FR"
        },
        {
            text: "When did the symptoms start?",
            context: "consultation",
            sourceLanguage: "en-US", 
            targetLanguage: "de-DE"
        },
        {
            text: "The patient needs immediate medical attention",
            context: "general",
            sourceLanguage: "en-US",
            targetLanguage: "it-IT"
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n📋 Test ${i + 1}: ${testCase.context.toUpperCase()} Context`);
        console.log(`Original (${testCase.sourceLanguage}): "${testCase.text}"`);
        
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
            
            if (response.ok) {
                console.log(`✅ Translation (${testCase.targetLanguage}): "${result.translatedText}"`);
                console.log(`🎯 Confidence: ${Math.round(result.confidence * 100)}%`);
                if (result.detectedLanguage) {
                    console.log(`🔍 Detected Language: ${result.detectedLanguage}`);
                }
            } else {
                console.log(`❌ Error: ${result.error || 'Translation failed'}`);
            }
        } catch (error) {
            console.log(`❌ Network Error: ${error.message}`);
        }
    }
    
    console.log('\n🚨 Testing Emergency Phrases...');
    try {
        const response = await fetch(`${baseUrl}/emergency-phrases?language=es-ES`);
        const phrases = await response.json();
        
        if (response.ok) {
            console.log('✅ Emergency phrases loaded:');
            phrases.forEach((phrase, index) => {
                console.log(`   ${index + 1}. ${phrase.text} (${phrase.category})`);
            });
        } else {
            console.log('❌ Failed to load emergency phrases');
        }
    } catch (error) {
        console.log(`❌ Emergency phrases error: ${error.message}`);
    }
    
    console.log('\n🔧 Testing complete! Both frontend (http://localhost:3000) and backend (http://localhost:3001) should be ready for use.');
}

testMedicalTranslation();
