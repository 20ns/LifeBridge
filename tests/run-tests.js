// Test runner for LifeBridge medical translation platform
const path = require('path');

class TestRunner {
  constructor() {
    this.testSuites = {
      unit: {
        'bedrock-nova-micro': './backend/unit/bedrock-nova-micro.test.js'
      },
      services: {
        'medical-context': './backend/services/medical-context.test.js'
      },
      integration: {
        'app-integration': './integration/app-integration.test.js'
      }
    };
  }

  async runUnitTests() {
    console.log('🧪 Running Unit Tests\n');
    
    try {
      const bedrockTest = require(this.testSuites.unit['bedrock-nova-micro']);
      if (bedrockTest.testNovaMicroIntegration) {
        const tests = bedrockTest.testNovaMicroIntegration();
        await tests.runTests();
      }
    } catch (error) {
      console.error('❌ Unit tests failed:', error.message);
    }
  }

  async runServiceTests() {
    console.log('\n🔧 Running Service Tests\n');
    
    try {
      const medicalContextTest = require(this.testSuites.services['medical-context']);
      await medicalContextTest.testMedicalTranslations();
    } catch (error) {
      console.error('❌ Service tests failed:', error.message);
    }
  }

  async runIntegrationTests() {
    console.log('\n🌐 Running Integration Tests\n');
      try {
      const { LifeBridgeIntegrationTests } = require(this.testSuites.integration['app-integration']);
      const integrationTester = new LifeBridgeIntegrationTests();
      await integrationTester.runAllTests();
    } catch (error) {
      console.error('❌ Integration tests failed:', error.message);
      console.log('💡 Note: Integration tests require backend server running on localhost:3001');
    }
  }

  async runAllTests() {
    console.log('🏥 LifeBridge Medical Translation - Test Suite Runner');
    console.log('=' .repeat(60));
    console.log('Running comprehensive tests for AWS Bedrock Nova Micro integration\n');
    
    const startTime = Date.now();
    
    await this.runUnitTests();
    await this.runServiceTests();
    await this.runIntegrationTests();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n✨ Test Suite Complete');
    console.log(`Total execution time: ${duration} seconds`);
    console.log('\n📋 Test Categories:');
    console.log('- Unit Tests: Direct AWS Bedrock Nova Micro integration');
    console.log('- Service Tests: Medical context translation service layer');
    console.log('- Integration Tests: Full application API endpoints');
  }

  // Individual test runners for specific test types
  async runSpecificTest(category, testName) {
    if (!this.testSuites[category] || !this.testSuites[category][testName]) {
      console.error(`❌ Test not found: ${category}/${testName}`);
      return;
    }

    console.log(`🧪 Running ${category}/${testName}\n`);
    
    try {
      const testModule = require(this.testSuites[category][testName]);
      
      // Handle different test module patterns
      if (category === 'unit' && testName === 'bedrock-nova-micro') {
        const tests = testModule.testNovaMicroIntegration();
        await tests.runTests();
      } else if (category === 'services' && testName === 'medical-context') {
        await testModule.testMedicalTranslations();
      } else if (category === 'integration' && testName === 'app-integration') {
        const tester = new testModule.LifeBridgeIntegrationTests();
        await tester.runAllTests();
      }
    } catch (error) {
      console.error(`❌ Test ${category}/${testName} failed:`, error.message);
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.length === 0) {
    // Run all tests
    await runner.runAllTests();
  } else if (args.length === 1) {
    // Run specific category
    const category = args[0];
    switch (category) {
      case 'unit':
        await runner.runUnitTests();
        break;
      case 'services':
        await runner.runServiceTests();
        break;
      case 'integration':
        await runner.runIntegrationTests();
        break;
      default:
        console.error('❌ Unknown test category. Use: unit, services, or integration');
    }
  } else if (args.length === 2) {
    // Run specific test
    const [category, testName] = args;
    await runner.runSpecificTest(category, testName);
  } else {
    console.log('Usage:');
    console.log('  node run-tests.js                    # Run all tests');
    console.log('  node run-tests.js unit               # Run unit tests');
    console.log('  node run-tests.js services           # Run service tests');
    console.log('  node run-tests.js integration        # Run integration tests');
    console.log('  node run-tests.js unit bedrock-nova-micro  # Run specific test');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestRunner };
