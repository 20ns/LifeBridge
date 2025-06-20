/**
 * Medical Grade Features Test Runner
 * Comprehensive testing suite for all medical-grade deployment features
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    testDir: path.join(__dirname),
    backendDir: path.join(__dirname, '..', 'backend'),
    frontendDir: path.join(__dirname, '..', 'frontend'),
    outputFile: path.join(__dirname, 'medical-grade-test-results.json'),
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Test suites to run
const TEST_SUITES = [
    {
        name: 'PHI Redaction',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'PHI Redaction Service',
        critical: true
    },
    {
        name: 'Audit Logging',
        file: 'e2e-medical-grade-features.test.js', 
        grep: 'Audit Logger Service',
        critical: true
    },
    {
        name: 'Quality Assurance',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Quality Assurance Service',
        critical: true
    },
    {
        name: 'Offline Capabilities',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Offline Service',
        critical: false
    },
    {
        name: 'Impact Metrics',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Impact Metrics Service',
        critical: false
    },
    {
        name: 'Complete Workflow',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Complete Translation Workflow',
        critical: true
    },
    {
        name: 'Human Review',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Human Review Workflow',
        critical: true
    },
    {
        name: 'Emergency Scenarios',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Emergency Scenarios',
        critical: true
    },
    {
        name: 'Compliance & Security',
        file: 'e2e-medical-grade-features.test.js',
        grep: 'Compliance and Security',
        critical: true
    }
];

// Results tracking
const testResults = {
    timestamp: new Date().toISOString(),
    overallStatus: 'PENDING',
    totalSuites: TEST_SUITES.length,
    passedSuites: 0,
    failedSuites: 0,
    criticalFailures: 0,
    suiteResults: [],
    summary: {}
};

// Utility functions
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const levels = {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        debug: '🔍'
    };
    
    const icon = levels[level] || '📋';
    console.log(`${icon} ${timestamp} - ${message}`);
    
    if (TEST_CONFIG.verbose && level === 'debug') {
        console.log(`   Debug: ${message}`);
    }
}

function validateEnvironment() {
    log('Validating test environment...', 'info');
    
    const requiredFiles = [
        path.join(TEST_CONFIG.backendDir, 'src', 'services', 'auditLogger.ts'),
        path.join(TEST_CONFIG.backendDir, 'src', 'services', 'qualityAssurance.ts'),
        path.join(TEST_CONFIG.backendDir, 'src', 'services', 'offlineService.ts'),
        path.join(TEST_CONFIG.backendDir, 'src', 'services', 'phiRedaction.ts'),
        path.join(TEST_CONFIG.backendDir, 'src', 'services', 'impactMetrics.ts'),
        path.join(TEST_CONFIG.backendDir, 'src', 'handlers', 'translate.ts'),
        path.join(TEST_CONFIG.backendDir, 'src', 'handlers', 'humanReview.ts')
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
        log(`Missing required files: ${missingFiles.join(', ')}`, 'error');
        return false;
    }
    
    log('Environment validation passed', 'success');
    return true;
}

async function runTestSuite(suite) {
    log(`Running test suite: ${suite.name}`, 'info');
    
    const startTime = Date.now();
    const suiteResult = {
        name: suite.name,
        file: suite.file,
        critical: suite.critical,
        status: 'RUNNING',
        startTime: new Date().toISOString(),
        duration: 0,
        tests: [],
        errors: []
    };
    
    try {
        // Run Jest with specific grep pattern
        const jestArgs = [
            suite.file,
            '--testNamePattern=' + suite.grep,
            '--json',
            '--verbose'
        ];
        
        if (TEST_CONFIG.verbose) {
            jestArgs.push('--verbose');
        }
          const result = await new Promise((resolve, reject) => {
            const jest = spawn('node', [path.join(TEST_CONFIG.testDir, 'node_modules', '.bin', 'jest'), ...jestArgs], {
                cwd: TEST_CONFIG.testDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });
            
            let stdout = '';
            let stderr = '';
            
            jest.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            jest.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            jest.on('close', (code) => {
                resolve({ code, stdout, stderr });
            });
            
            jest.on('error', (error) => {
                reject(error);
            });
        });
        
        const duration = Date.now() - startTime;
        suiteResult.duration = duration;
        suiteResult.endTime = new Date().toISOString();
        
        if (result.code === 0) {
            suiteResult.status = 'PASSED';
            log(`✅ ${suite.name} - PASSED (${duration}ms)`, 'success');
            testResults.passedSuites++;
        } else {
            suiteResult.status = 'FAILED';
            suiteResult.errors.push(result.stderr);
            log(`❌ ${suite.name} - FAILED (${duration}ms)`, 'error');
            testResults.failedSuites++;
            
            if (suite.critical) {
                testResults.criticalFailures++;
                log(`🚨 Critical test suite failed: ${suite.name}`, 'error');
            }
        }
        
        // Parse Jest JSON output if available
        try {
            const lines = result.stdout.split('\n');
            const jsonLine = lines.find(line => line.startsWith('{') && line.includes('testResults'));
            if (jsonLine) {
                const jestResult = JSON.parse(jsonLine);
                suiteResult.tests = jestResult.testResults[0]?.assertionResults || [];
            }
        } catch (parseError) {
            log(`Warning: Could not parse Jest output for ${suite.name}`, 'warning');
        }
        
    } catch (error) {
        suiteResult.status = 'ERROR';
        suiteResult.errors.push(error.message);
        suiteResult.duration = Date.now() - startTime;
        suiteResult.endTime = new Date().toISOString();
        
        log(`💥 ${suite.name} - ERROR: ${error.message}`, 'error');
        testResults.failedSuites++;
        
        if (suite.critical) {
            testResults.criticalFailures++;
        }
    }
    
    testResults.suiteResults.push(suiteResult);
    return suiteResult;
}

async function generateReport() {
    log('Generating test report...', 'info');
    
    // Calculate overall status
    if (testResults.criticalFailures > 0) {
        testResults.overallStatus = 'CRITICAL_FAILURE';
    } else if (testResults.failedSuites > 0) {
        testResults.overallStatus = 'PARTIAL_FAILURE';
    } else {
        testResults.overallStatus = 'SUCCESS';
    }
    
    // Generate summary
    testResults.summary = {
        totalTests: testResults.suiteResults.reduce((sum, suite) => sum + suite.tests.length, 0),
        passedTests: testResults.suiteResults.reduce((sum, suite) => 
            sum + suite.tests.filter(test => test.status === 'passed').length, 0),
        failedTests: testResults.suiteResults.reduce((sum, suite) => 
            sum + suite.tests.filter(test => test.status === 'failed').length, 0),
        totalDuration: testResults.suiteResults.reduce((sum, suite) => sum + suite.duration, 0),
        criticalSuitesPassed: testResults.suiteResults.filter(suite => 
            suite.critical && suite.status === 'PASSED').length,
        criticalSuitesTotal: TEST_SUITES.filter(suite => suite.critical).length
    };
    
    // Save detailed results to file
    fs.writeFileSync(TEST_CONFIG.outputFile, JSON.stringify(testResults, null, 2));
    
    // Print summary to console
    console.log('\n' + '='.repeat(80));
    console.log('🏥 MEDICAL GRADE FEATURES TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Overall Status: ${getStatusIcon(testResults.overallStatus)} ${testResults.overallStatus}`);
    console.log(`Test Suites: ${testResults.passedSuites}/${testResults.totalSuites} passed`);
    console.log(`Critical Suites: ${testResults.summary.criticalSuitesPassed}/${testResults.summary.criticalSuitesTotal} passed`);
    console.log(`Total Tests: ${testResults.summary.passedTests}/${testResults.summary.totalTests} passed`);
    console.log(`Total Duration: ${testResults.summary.totalDuration}ms`);
    console.log(`Report saved to: ${TEST_CONFIG.outputFile}`);
    
    if (testResults.criticalFailures > 0) {
        console.log(`\n🚨 CRITICAL FAILURES DETECTED: ${testResults.criticalFailures}`);
        console.log('Medical-grade deployment is NOT ready until critical issues are resolved.');
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Detailed suite results
    console.log('\nDETAILED RESULTS:');
    testResults.suiteResults.forEach(suite => {
        const icon = getStatusIcon(suite.status);
        console.log(`${icon} ${suite.name} (${suite.duration}ms) ${suite.critical ? '[CRITICAL]' : ''}`);
        
        if (suite.errors.length > 0 && TEST_CONFIG.verbose) {
            suite.errors.forEach(error => {
                console.log(`   Error: ${error.substring(0, 200)}...`);
            });
        }
    });
    
    return testResults;
}

function getStatusIcon(status) {
    const icons = {
        'PASSED': '✅',
        'SUCCESS': '✅',
        'FAILED': '❌',
        'ERROR': '💥',
        'CRITICAL_FAILURE': '🚨',
        'PARTIAL_FAILURE': '⚠️',
        'RUNNING': '🔄',
        'PENDING': '⏳'
    };
    return icons[status] || '❓';
}

async function runAllTests() {
    const startTime = Date.now();
    
    console.log('🏥 Starting Medical Grade Features Test Suite');
    console.log('='.repeat(80));
    
    // Validate environment
    if (!validateEnvironment()) {
        log('Environment validation failed. Aborting tests.', 'error');
        process.exit(1);
    }
    
    // Run all test suites
    for (const suite of TEST_SUITES) {
        await runTestSuite(suite);
        
        // Add delay between tests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate and display report
    const finalResults = await generateReport();
    
    const totalDuration = Date.now() - startTime;
    log(`All tests completed in ${totalDuration}ms`, 'info');
    
    // Exit with appropriate code
    if (finalResults.criticalFailures > 0) {
        process.exit(2); // Critical failure
    } else if (finalResults.failedSuites > 0) {
        process.exit(1); // Some failures
    } else {
        process.exit(0); // All passed
    }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Medical Grade Features Test Runner

Usage: node run-medical-grade-tests.js [options]

Options:
  --verbose, -v    Show detailed output and debug information
  --help, -h       Show this help message

Exit Codes:
  0 - All tests passed
  1 - Some tests failed (non-critical)
  2 - Critical tests failed (deployment not ready)

Output:
  Detailed results are saved to: ${TEST_CONFIG.outputFile}
    `);
    process.exit(0);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        log(`Unexpected error: ${error.message}`, 'error');
        process.exit(3);
    });
}

module.exports = {
    runAllTests,
    runTestSuite,
    TEST_CONFIG,
    TEST_SUITES
};
