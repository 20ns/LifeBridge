/**
 * Test Nova Micro's capability to analyze sign language gestures
 * This will help determine if we can replace the complex ML setup
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
    region: 'eu-north-1' // Your region
});

async function testNovaMicroSignLanguage() {
    console.log('🧪 Testing Nova Micro Sign Language Analysis...\n');

    // Test different approaches to sign language analysis
    const testCases = [
        {
            name: 'Basic Sign Language Description',
            prompt: `Analyze this medical sign language gesture: A person is making a closed fist with their right hand, holding it up at chest level. In medical emergency contexts, what could this gesture mean? Is this likely an emergency sign?`
        },
        {
            name: 'Medical Context Sign Analysis',
            prompt: `You are a medical sign language interpreter. A patient is showing these hand gestures:
            
            Gesture 1: Closed fist held up
            Gesture 2: Flat hand pointing to chest
            Gesture 3: Thumbs up
            
            In a hospital emergency room context, what do these gestures likely mean? Rank them by medical urgency.`
        },
        {
            name: 'Emergency Sign Language Interpretation',
            prompt: `MEDICAL EMERGENCY CONTEXT: A deaf patient in an emergency room is making hand gestures. The patient is:
            
            - Making a closed fist and shaking it
            - Pointing to their chest/heart area
            - Looking distressed
            
            As a medical sign language expert, what is the most likely meaning of these gestures? What immediate actions should medical staff take?`
        },
        {
            name: 'Sign Language Gesture Classification',
            prompt: `Classify these common medical sign language gestures by urgency level:

            1. Closed fist (emergency sign)
            2. Open palm pointing (help sign)  
            3. Fingers pinched together (medicine sign)
            4. Cupped hand (water sign)
            5. Thumbs up (yes/okay sign)
            6. Thumbs down (no sign)
            
            For each gesture, provide: urgency level (1-10), medical meaning, and recommended response.`
        }
    ];

    const results = [];

    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        console.log(`Prompt: ${testCase.prompt.substring(0, 100)}...`);
        
        try {
            const response = await invokeNovaModel(testCase.prompt);
            console.log(`✅ Response received (${response.length} characters)`);
            
            results.push({
                testCase: testCase.name,
                success: true,
                response: response,
                responseLength: response.length
            });
            
            // Show first part of response
            console.log(`Preview: ${response.substring(0, 200)}...`);
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            results.push({
                testCase: testCase.name,
                success: false,
                error: error.message
            });
        }
        
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful tests: ${successful}/${results.length}`);
    console.log(`❌ Failed tests: ${failed}/${results.length}`);
    
    if (successful > 0) {
        console.log('\n🎯 Nova Micro Sign Language Analysis Capability:');
        results.filter(r => r.success).forEach(result => {
            console.log(`\n📝 ${result.testCase}:`);
            console.log(`Response: ${result.response.substring(0, 300)}...`);
            console.log(`Full response length: ${result.responseLength} characters`);
        });
        
        console.log('\n💡 Recommendation:');
        console.log('Nova Micro appears capable of sign language analysis.');
        console.log('We can potentially replace the complex ML setup with Nova Micro.');
        
    } else {
        console.log('\n⚠️ Nova Micro may not be suitable for sign language analysis.');
        console.log('Consider keeping the existing MediaPipe rule-based approach.');
    }
    
    return results;
}

async function invokeNovaModel(prompt) {
    const modelId = 'amazon.nova-micro-v1:0';
    
    const payload = {
        messages: [
            {
                role: 'user',
                content: [
                    {
                        text: prompt
                    }
                ]
            }
        ],
        inferenceConfig: {
            maxTokens: 1000,
            temperature: 0.1,
            topP: 0.9
        }
    };

    const command = new InvokeModelCommand({
        modelId: modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json'
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.output.message.content[0].text;
}

// Run the test
if (require.main === module) {
    testNovaMicroSignLanguage()
        .then(() => {
            console.log('\n🏁 Test completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testNovaMicroSignLanguage };
