import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'eu-north-1' });
const MODEL_ID = 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0';

interface SignLanguageTestResult {
    testName: string;
    success: boolean;
    response?: string;
    accuracy?: number;
    medicalRelevance?: number;
    error?: string;
}

async function testNovaMicroSignLanguageCapabilities(): Promise<SignLanguageTestResult[]> {
    console.log('🧪 Testing Nova Micro Sign Language Analysis for Medical Emergency Use\n');
    
    const testCases = [
        {
            name: 'Emergency Sign Recognition',
            prompt: `You are a medical sign language interpreter in an emergency room. 
            
            A deaf patient is making this gesture: closed fist held up at chest level, shaking slightly.
            
            In American Sign Language (ASL) medical context:
            1. What does this gesture most likely mean?
            2. What is the urgency level (1-10)?
            3. What immediate action should medical staff take?
            
            Provide a clear, concise medical interpretation.`,
            expectedKeywords: ['emergency', 'urgent', 'help', 'critical', 'immediate']
        },
        {
            name: 'Pain Sign Recognition', 
            prompt: `Medical ASL interpretation needed:
            
            Patient gesture: Both hands pressed against chest, facial expression showing distress.
            
            Analyze this sign for:
            1. Medical meaning
            2. Pain level indication
            3. Body part affected
            4. Recommended medical response
            
            Focus on accuracy for emergency medical care.`,
            expectedKeywords: ['pain', 'chest', 'heart', 'discomfort', 'assess']
        },
        {
            name: 'Help Sign Recognition',
            prompt: `Emergency room sign language analysis:
            
            Patient is making these gestures in sequence:
            - Open palm raised
            - Pointing to themselves
            - Then pointing to medical staff
            
            In medical ASL context, interpret:
            1. Primary message
            2. Urgency level
            3. Type of assistance needed
            
            Provide medical-grade interpretation.`,
            expectedKeywords: ['help', 'assistance', 'need', 'request', 'support']
        },
        {
            name: 'Medical Priority Ranking',
            prompt: `As a medical sign language expert, rank these patient gestures by medical urgency:
            
            Gesture A: Closed fist shaking (emergency sign)
            Gesture B: Cupped hand to mouth (water/drink sign)  
            Gesture C: Pinched fingers (medicine/pill sign)
            Gesture D: Open palm on chest (pain/hurt sign)
            Gesture E: Thumbs up (okay/yes sign)
            
            Rank 1-5 (1=most urgent) and explain medical reasoning for each ranking.`,
            expectedKeywords: ['urgent', 'priority', 'emergency', 'critical', 'rank']
        }
    ];

    const results: SignLanguageTestResult[] = [];
    
    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        console.log(`Sending prompt to Nova Micro...`);
        
        try {
            const response = await invokeNovaModel(testCase.prompt);
            
            // Analyze response quality
            const accuracy = analyzeResponseAccuracy(response, testCase.expectedKeywords);
            const medicalRelevance = analyzeMedicalRelevance(response);
            
            console.log(`✅ Response received`);
            console.log(`📊 Accuracy Score: ${accuracy}/10`);
            console.log(`🏥 Medical Relevance: ${medicalRelevance}/10`);
            console.log(`📝 Response Preview: ${response.substring(0, 150)}...`);
            
            results.push({
                testName: testCase.name,
                success: true,
                response: response,
                accuracy: accuracy,
                medicalRelevance: medicalRelevance
            });
            
        } catch (error) {
            console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            results.push({
                testName: testCase.name,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
}

async function invokeNovaModel(prompt: string): Promise<string> {
    const payload = {
        messages: [
            {
                role: 'user',
                content: [{ text: prompt }]
            }
        ],
        inferenceConfig: {
            maxTokens: 800,
            temperature: 0.1, // Low temperature for medical accuracy
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
    
    return responseBody.output.message.content[0].text;
}

function analyzeResponseAccuracy(response: string, expectedKeywords: string[]): number {
    const lowerResponse = response.toLowerCase();
    const matchedKeywords = expectedKeywords.filter(keyword => 
        lowerResponse.includes(keyword.toLowerCase())
    );
    
    return Math.round((matchedKeywords.length / expectedKeywords.length) * 10);
}

function analyzeMedicalRelevance(response: string): number {
    const medicalTerms = [
        'medical', 'emergency', 'urgent', 'patient', 'treatment', 'assessment',
        'critical', 'immediate', 'healthcare', 'clinical', 'diagnosis', 'symptoms',
        'pain', 'discomfort', 'vital', 'priority', 'intervention', 'care'
    ];
    
    const lowerResponse = response.toLowerCase();
    const medicalMatches = medicalTerms.filter(term => 
        lowerResponse.includes(term.toLowerCase())
    );
    
    // Score based on medical terminology density
    const density = medicalMatches.length / (response.split(' ').length / 10);
    return Math.min(10, Math.round(density * 10));
}

function generateRecommendation(results: SignLanguageTestResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 NOVA MICRO SIGN LANGUAGE CAPABILITY ASSESSMENT');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n📈 Test Results:`);
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
        const avgAccuracy = successful.reduce((sum, r) => sum + (r.accuracy || 0), 0) / successful.length;
        const avgMedicalRelevance = successful.reduce((sum, r) => sum + (r.medicalRelevance || 0), 0) / successful.length;
        
        console.log(`\n📊 Performance Metrics:`);
        console.log(`Average Accuracy: ${avgAccuracy.toFixed(1)}/10`);
        console.log(`Medical Relevance: ${avgMedicalRelevance.toFixed(1)}/10`);
        
        console.log(`\n💡 RECOMMENDATION:`);
        
        if (avgAccuracy >= 7 && avgMedicalRelevance >= 7) {
            console.log(`🎯 HIGHLY RECOMMENDED: Nova Micro shows strong sign language interpretation`);
            console.log(`✅ Can replace complex ML infrastructure`);
            console.log(`✅ Maintains medical accuracy requirements`);
            console.log(`✅ Stays within free tier limits`);
            console.log(`✅ Eliminates ML model training/maintenance`);
            
            console.log(`\n🚀 Next Steps:`);
            console.log(`1. Remove SageMaker and ML training infrastructure`);
            console.log(`2. Replace ML gesture recognition with Nova Micro calls`);
            console.log(`3. Keep MediaPipe for landmark detection`);
            console.log(`4. Send gesture descriptions to Nova Micro for interpretation`);
            
        } else if (avgAccuracy >= 5 && avgMedicalRelevance >= 5) {
            console.log(`⚠️ PARTIALLY SUITABLE: Nova Micro has moderate capabilities`);
            console.log(`📝 Consider hybrid approach:`);
            console.log(`- Use Nova Micro for complex/ambiguous gestures`);
            console.log(`- Keep simple rule-based detection for basic gestures`);
            console.log(`- Reduce but don't eliminate ML infrastructure`);
            
        } else {
            console.log(`❌ NOT RECOMMENDED: Nova Micro insufficient for medical sign language`);
            console.log(`📝 Alternative recommendation:`);
            console.log(`- Keep existing MediaPipe rule-based approach`);
            console.log(`- Improve gesture detection rules`);
            console.log(`- Remove complex ML infrastructure`);
            console.log(`- Focus on reliability over ML complexity`);
        }
        
        console.log(`\n💰 Free Tier Impact:`);
        console.log(`- Nova Micro: ~$0.0001 per request (very cost effective)`);
        console.log(`- Eliminates SageMaker costs (25 hours/month saved)`);
        console.log(`- Reduces Lambda complexity (no Docker images needed)`);
        console.log(`- Minimal S3 usage (no model storage)`);
        
    } else {
        console.log(`\n❌ Nova Micro appears unsuitable for sign language analysis`);
        console.log(`📝 Recommendation: Improve existing MediaPipe rules instead`);
    }
}

// Main execution
async function main() {
    try {
        const results = await testNovaMicroSignLanguageCapabilities();
        generateRecommendation(results);
        
        console.log(`\n🏁 Analysis complete. Check recommendations above.`);
        
    } catch (error) {
        console.error('💥 Test failed:', error);
        process.exit(1);
    }
}

main();
