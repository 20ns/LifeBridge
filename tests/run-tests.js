// Test runner for LifeBridge medical translation platform
const path = require('path');
const { execSync } = require('child_process');

class TestRunner {
  constructor() {
    // Maps category names to directory paths for Jest, relative to the 'tests' directory
    this.categoryPaths = {
      unit: 'backend/unit',
      services: 'backend/services',
      integration: 'integration'
    };
    // Maps category and test names to specific file paths for Jest, relative to the 'tests' directory
    this.testFiles = {
      unit: {
        'bedrock-nova-micro': 'backend/unit/bedrock-nova-micro.test.js'
      },
      services: {
        'medical-context': 'backend/services/medical-context.test.js'
      },
      integration: {
        'app-integration': 'integration/app-integration.test.js'
        // Add other specific integration tests here if needed, e.g.:
        // 'other-integration': 'integration/other-integration.test.js'
      }
    };
    // Base Jest command. Assumes jest.config.js is in the 'tests' directory.
    // Prepending npx to ensure Jest is found and executed correctly.
    this.jestCommandBase = 'npx jest --verbose';
    // Options for execSync: run from 'tests' directory and inherit stdio.
    this.jestOptions = { stdio: 'inherit', cwd: __dirname };
  }

  _executeJest(targetPath) { // targetPath can be a directory or a file path
    try {
      const command = `${this.jestCommandBase} ${targetPath}`;
      console.log(`\n🎬 Executing: ${command} (in ${this.jestOptions.cwd})`);
      execSync(command, this.jestOptions);
      // Jest's output will indicate success or failure.
    } catch (error) {
      // execSync throws if Jest returns a non-zero exit code (indicating test failures or an error).
      // Jest itself will have printed detailed error messages to the console.
      console.error(`❌ Jest execution for "${targetPath}" reported errors or test failures. See output above for details.`);
      // We don't re-throw here to allow the script to continue with other test categories or files if applicable.
    }
  }

  async runUnitTests() {
    console.log('🧪 Running Unit Tests (all in category)\n');
    this._executeJest(this.categoryPaths.unit);
  }

  async runServiceTests() {
    console.log('\n🔧 Running Service Tests (all in category)\n');
    this._executeJest(this.categoryPaths.services);
  }

  async runIntegrationTests() {
    console.log('\n🌐 Running Integration Tests (all in category)\n');
    this._executeJest(this.categoryPaths.integration);
    // This note is still relevant for integration tests.
    console.log('💡 Note: Integration tests might require the backend server to be running on localhost:3001');
  }

  async runAllTests() {
    console.log('🏥 LifeBridge Medical Translation - Test Suite Runner');
    console.log('=' .repeat(60));
    console.log('Running comprehensive tests for AWS Bedrock Nova Micro integration\n');
    
    const startTime = Date.now();
    
    // The script will run tests category by category.
    // Alternatively, to run all tests found by Jest based on its config in one go:
    // this._executeJest(''); // This would run `jest --verbose`
    
    await this.runUnitTests();
    await this.runServiceTests();
    await this.runIntegrationTests();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n✨ Test Suite Complete');
    console.log(`Total execution time: ${duration} seconds`);
    // Jest provides its own summary, so this can be a high-level overview.
    console.log('\n📋 Test Categories Executed:');
    console.log('- Unit Tests: Direct AWS Bedrock Nova Micro integration');
    console.log('- Service Tests: Medical context translation service layer');
    console.log('- Integration Tests: Full application API endpoints');
  }

  async runSpecificTest(category, testName) {
    // Ensure category and testName are consistently cased for lookup or convert them.
    const lowerCategory = category.toLowerCase();
    const lowerTestName = testName.toLowerCase();

    if (!this.testFiles[lowerCategory] || !this.testFiles[lowerCategory][lowerTestName]) {
      console.error(`❌ Test not found: ${category}/${testName}`);
      console.log('Available categories for specific tests:');
      Object.keys(this.testFiles).forEach(cat => {
        console.log(`  ${cat}: ${Object.keys(this.testFiles[cat]).join(', ')}`);
      });
      return;
    }

    const testFilePath = this.testFiles[lowerCategory][lowerTestName];
    console.log(`🧪 Running specific test: ${category}/${testName} (${testFilePath})\n`);
    this._executeJest(testFilePath);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.length === 0) {
    await runner.runAllTests();
  } else if (args.length === 1) {
    const categoryArg = args[0].toLowerCase(); // Use lowercase for switch
    switch (categoryArg) {
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
        console.error(`❌ Unknown test category: "${args[0]}". Use: unit, services, or integration.`);
        console.log('Alternatively, run a specific test: node run-tests.js <category> <testName>');
    }
  } else if (args.length === 2) {
    // For runSpecificTest, we pass original args as it handles casing internally or uses lowercase keys.
    // Let's ensure testFiles keys are lowercase for robust lookup.
    // (Assuming constructor ensures testFiles keys are lowercase or lookup handles it)
    await runner.runSpecificTest(args[0], args[1]);
  } else {
    console.log('Usage:');
    console.log('  node run-tests.js                    # Run all tests (unit, services, integration)');
    console.log('  node run-tests.js unit               # Run all unit tests');
    console.log('  node run-tests.js services           # Run all service tests');
    console.log('  node run-tests.js integration        # Run all integration tests');
    console.log('  node run-tests.js unit bedrock-nova-micro  # Run a specific test (ensure names match definitions)');
    // Add more examples if testFiles has more entries
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error("FATAL ERROR in test runner:", err);
    process.exit(1); // Exit with an error code if main crashes
  });
}

module.exports = { TestRunner }; // Keep exports if other scripts might use this class
