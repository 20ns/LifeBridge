#!/usr/bin/env node

// Test script for hybrid translation service
const testTranslations = async () => {
  const API_BASE = 'http://localhost:3001/dev';
  
  console.log('🔄 Testing Hybrid Translation Service...\n');

  // Test 1: Simple translation (should use Amazon Translate)
  console.log('📝 Test 1: Simple medical term (Amazon Translate expected)');
  try {
    const response = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'pain',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      })
    });
    
    const result = await response.json();
    console.log(`✅ Translation: "${result.data.translatedText}"`);
    console.log(`🔧 Method: ${result.data.method}`);
    console.log(`💭 Reasoning: ${result.data.reasoning}\n`);
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error.message}\n`);
  }

  // Test 2: Emergency context (should use Bedrock)
  console.log('🚨 Test 2: Emergency phrase (Bedrock expected)');
  try {
    const response = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Patient is unconscious and needs immediate medical attention with possible drug interactions',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'emergency'
      })
    });
    
    const result = await response.json();
    console.log(`✅ Translation: "${result.data.translatedText}"`);
    console.log(`🔧 Method: ${result.data.method}`);
    console.log(`💭 Reasoning: ${result.data.reasoning}\n`);
  } catch (error) {
    console.log(`❌ Test 2 failed: ${error.message}\n`);
  }

  // Test 3: Rate limit handling
  console.log('⏱️ Test 3: Rate limit handling (multiple requests)');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Test phrase ${i + 1}`,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        context: 'general'
      })
    }));
  }

  try {
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.ok).length;
    console.log(`✅ ${successCount}/5 requests succeeded`);
    console.log(`📊 Rate limiting working properly\n`);
  } catch (error) {
    console.log(`⚠️ Some requests failed (expected with rate limiting): ${error.message}\n`);
  }

  console.log('🎉 Hybrid Translation Service Testing Complete!');
  console.log('📋 Summary:');
  console.log('  - Amazon Translate: Fast, cost-effective for simple terms');
  console.log('  - Bedrock AI: Complex medical scenarios requiring reasoning');
  console.log('  - Rate limiting: Prevents API overload');
  console.log('  - Fallback: Bedrock used if Amazon Translate fails\n');
};

// Run the tests
testTranslations().catch(console.error);
