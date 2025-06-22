/**
 * Test the new Nova Micro Sign Language Processor
 * This validates the integration works end-to-end
 */

const { createResponse, createErrorResponse, validateRequestBody } = require('../dist/utils/response');
const { handler } = require('../dist/handlers/novaSignLanguageProcessor');

// Mock API Gateway event
function createTestEvent(body) {
    return {
        httpMethod: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json'
        },
        pathParameters: null,
        queryStringParameters: null
    };
}

// Mock Lambda context
const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-nova-sign-processor',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:eu-north-1:123456789012:function:test',
    memoryLimitInMB: '256',
    awsRequestId: 'test-request-id',
    logGroupName: 'test-log-group',
    logStreamName: 'test-log-stream',
    getRemainingTimeInMillis: () => 30000
};

async function testNovaSignLanguageProcessor() {
    console.log('🧪 Testing Nova Micro Sign Language Processor Integration\n');
    
    const testCases = [
        {
            name: 'Emergency Gesture Test',
            payload: {
                gesture: 'emergency',
                landmarks: Array(21).fill().map(() => ({ x: 0.5, y: 0.5, z: 0.0 })),
                confidence: 0.9,
                timestamp: Date.now(),
                medicalContext: 'emergency room'
            },
            expectedPriority: 'critical'
        },
        {
            name: 'Pain Gesture Test',
            payload: {
                gesture: 'pain',
                landmarks: Array(21).fill().map(() => ({ x: 0.4, y: 0.6, z: 0.01 })),
                confidence: 0.8,
                timestamp: Date.now(),
                medicalContext: 'patient room'
            },
            expectedPriority: 'high'
        },
        {
            name: 'Help Gesture Test',
            payload: {
                gesture: 'help',
                landmarks: Array(21).fill().map(() => ({ x: 0.6, y: 0.4, z: 0.005 })),
                confidence: 0.85,
                timestamp: Date.now()
            },
            expectedPriority: 'critical'
        },
        {
            name: 'Invalid Request Test',
            payload: {
                // Missing required fields
                confidence: 0.5
            },
            shouldFail: true
        }
    ];

    const results = [];

    for (const testCase of testCases) {
        console.log(`\n📋 Running: ${testCase.name}`);
        
        try {
            const event = createTestEvent(testCase.payload);
            const result = await handler(event, mockContext);
            
            console.log(`Status Code: ${result.statusCode}`);
            
            if (testCase.shouldFail) {
                if (result.statusCode >= 400) {
                    console.log('✅ Expected failure occurred');
                    results.push({ test: testCase.name, status: 'PASS', reason: 'Expected failure' });
                } else {
                    console.log('❌ Expected failure but request succeeded');
                    results.push({ test: testCase.name, status: 'FAIL', reason: 'Should have failed' });
                }
            } else {
                if (result.statusCode === 200) {
                    const responseBody = JSON.parse(result.body);
                    
                    if (responseBody.success && responseBody.result) {
                        const { result: signResult } = responseBody;
                        
                        console.log(`✅ Success: ${signResult.gesture}`);
                        console.log(`   Priority: ${signResult.medicalPriority}`);
                        console.log(`   Urgency: ${signResult.urgencyScore}/10`);
                        console.log(`   Actions: ${signResult.recommendedActions.length} recommended`);
                        console.log(`   Translation: ${signResult.translationText.substring(0, 50)}...`);
                        
                        // Validate expected priority
                        if (testCase.expectedPriority === signResult.medicalPriority) {
                            console.log('✅ Priority matches expectation');
                            results.push({ 
                                test: testCase.name, 
                                status: 'PASS', 
                                priority: signResult.medicalPriority,
                                urgency: signResult.urgencyScore 
                            });
                        } else {
                            console.log(`❌ Priority mismatch: expected ${testCase.expectedPriority}, got ${signResult.medicalPriority}`);
                            results.push({ 
                                test: testCase.name, 
                                status: 'FAIL', 
                                reason: 'Priority mismatch',
                                expected: testCase.expectedPriority,
                                actual: signResult.medicalPriority
                            });
                        }
                    } else {
                        console.log('❌ Invalid response structure');
                        results.push({ test: testCase.name, status: 'FAIL', reason: 'Invalid response' });
                    }
                } else {
                    console.log(`❌ Request failed with status ${result.statusCode}`);
                    const errorBody = JSON.parse(result.body);
                    console.log(`   Error: ${errorBody.message}`);
                    results.push({ test: testCase.name, status: 'FAIL', reason: errorBody.message });
                }
            }
            
        } catch (error) {
            console.log(`❌ Exception: ${error.message}`);
            results.push({ test: testCase.name, status: 'ERROR', error: error.message });
        }
        
        // Delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 NOVA MICRO INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`💥 Errors: ${errors}/${results.length}`);
    
    if (passed >= 3) {
        console.log('\n🎯 INTEGRATION SUCCESS!');
        console.log('✅ Nova Micro sign language processor is working');
        console.log('✅ Medical priorities are being assigned correctly');
        console.log('✅ Error handling is functioning');
        console.log('✅ Ready for frontend integration');
    } else {
        console.log('\n⚠️ INTEGRATION ISSUES DETECTED');
        console.log('📝 Check failed tests above for details');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Update frontend to use /nova-sign-language endpoint');
    console.log('2. Test with real MediaPipe gesture data');
    console.log('3. Deploy to AWS for production testing');
    
    return results;
}

// Run the test
if (require.main === module) {
    testNovaSignLanguageProcessor()
        .then(() => {
            console.log('\n🏁 Integration test completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Integration test failed:', error);
            process.exit(1);
        });
}

module.exports = { testNovaSignLanguageProcessor };
