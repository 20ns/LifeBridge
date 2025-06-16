// Simple test to evaluate Nova Micro's sign language capabilities
// Using existing working backend infrastructure

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: 'eu-north-1' });
const MODEL_ID = 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0';

async function testSignLanguageCapability() {
    console.log('🧪 Testing Nova Micro Sign Language Analysis\n');
    
    const testPrompt = `You are a medical sign language interpreter in an emergency room.

A deaf patient is making this gesture: closed fist held up at chest level, shaking slightly.

In American Sign Language (ASL) medical context:
1. What does this gesture most likely mean?
2. What is the urgency level (1-10)?
3. What immediate action should medical staff take?

Provide a clear, concise medical interpretation.`;

    try {
        console.log('📤 Sending request to Nova Micro...');
        
        const payload = {
            messages: [
                {
                    role: 'user',
                    content: [{ text: testPrompt }]
                }
            ],
            inferenceConfig: {
                maxTokens: 500,
                temperature: 0.1,
                topP: 0.9
            }
        };

        const command = new InvokeModelCommand({
            modelId: MODEL_ID,
            body: JSON.stringify(payload),
            contentType: 'application/json'
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const result = responseBody.output.message.content[0].text;
        
        console.log('✅ Response received from Nova Micro:\n');
        console.log('='.repeat(60));
        console.log(result);
        console.log('='.repeat(60));
        
        // Analyze the response quality
        const hasEmergencyKeywords = /emergency|urgent|critical|immediate|help/i.test(result);
        const hasMedicalKeywords = /medical|patient|staff|treatment|assessment/i.test(result);
        const hasUrgencyScore = /\b([1-9]|10)\b/.test(result);
        
        console.log('\n📊 Response Analysis:');
        console.log(`Emergency Keywords: ${hasEmergencyKeywords ? '✅' : '❌'}`);
        console.log(`Medical Keywords: ${hasMedicalKeywords ? '✅' : '❌'}`);
        console.log(`Urgency Scoring: ${hasUrgencyScore ? '✅' : '❌'}`);
        
        const overallQuality = [hasEmergencyKeywords, hasMedicalKeywords, hasUrgencyScore].filter(Boolean).length;
        
        console.log(`\n💡 Overall Quality: ${overallQuality}/3`);
        
        if (overallQuality >= 2) {
            console.log('\n🎯 RECOMMENDATION: Nova Micro shows promise for sign language interpretation');
            console.log('✅ Can potentially replace complex ML infrastructure');
            console.log('✅ Maintains medical context understanding');
            console.log('✅ Cost-effective for free tier usage');
        } else {
            console.log('\n⚠️  RECOMMENDATION: Nova Micro may need improvement or hybrid approach');
            console.log('📝 Consider keeping existing MediaPipe rule-based detection');
        }
        
    } catch (error) {
        console.error('❌ Error testing Nova Micro:', error.message);
        console.log('\n📝 If Nova Micro fails, recommend focusing on MediaPipe improvements');
    }
}

// Test a few more scenarios quickly
async function runQuickTests() {
    const quickTests = [
        {
            name: 'Pain Gesture',
            gesture: 'both hands pressed against chest, facial expression showing distress',
            expected: 'pain'
        },
        {
            name: 'Help Gesture', 
            gesture: 'open palm raised, pointing to themselves',
            expected: 'help'
        }
    ];
    
    console.log('\n🔬 Running additional quick tests...\n');
    
    for (const test of quickTests) {
        try {
            const prompt = `Medical ASL: Patient making gesture: ${test.gesture}. What does this mean medically? Be concise.`;
            
            const payload = {
                messages: [{ role: 'user', content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 200, temperature: 0.1 }
            };

            const command = new InvokeModelCommand({
                modelId: MODEL_ID,
                body: JSON.stringify(payload),
                contentType: 'application/json'
            });

            const response = await client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const result = responseBody.output.message.content[0].text;
            
            const hasExpected = result.toLowerCase().includes(test.expected);
            console.log(`${test.name}: ${hasExpected ? '✅' : '❌'} - ${result.substring(0, 100)}...`);
            
        } catch (error) {
            console.log(`${test.name}: ❌ Error - ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function main() {
    console.log('🏥 LifeBridge Sign Language Capability Assessment');
    console.log('Testing Nova Micro for Medical Emergency Sign Language\n');
    
    await testSignLanguageCapability();
    await runQuickTests();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 SUMMARY & RECOMMENDATION');
    console.log('='.repeat(60));
    console.log('Based on the test results above:');
    console.log('');
    console.log('IF Nova Micro performed well (✅✅✅):');
    console.log('→ Remove complex ML infrastructure');
    console.log('→ Use Nova Micro for sign language interpretation');
    console.log('→ Keep MediaPipe for gesture detection');
    console.log('→ Significant cost savings and simplification');
    console.log('');
    console.log('IF Nova Micro performed poorly (❌❌❌):');
    console.log('→ Focus on improving MediaPipe rule-based detection');
    console.log('→ Remove complex ML training infrastructure anyway');
    console.log('→ Rely on proven MediaPipe + improved rules');
    console.log('→ Still achieve cost savings and reliability');
    console.log('\n🏁 Test completed. Check results above for decision.');
}

main();
