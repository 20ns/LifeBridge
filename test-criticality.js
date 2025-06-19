// Test script for improved criticality system
const { analyzeMedicalContent } = require('./frontend/src/utils/medicalTerminology.ts');

// Test cases
const testCases = [
  "I have chronic heart pain",
  "I have sudden chest pain", 
  "I have severe chest pain",
  "My usual headache is back",
  "I have acute abdominal pain",
  "My regular medication dosage"
];

console.log("=== LifeBridge Criticality System Test ===\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase}"`);
  const analysis = analyzeMedicalContent(testCase);
  
  console.log(`  Emergency: ${analysis.isEmergency ? '✅' : '❌'}`);
  console.log(`  Context: ${analysis.recommendedContext}`);
  console.log(`  Condition Type: ${analysis.modifierContext}`);
  console.log(`  Criticality: ${analysis.criticalityScore}/100`);
  console.log(`  Medical Terms: ${analysis.detectedTerms.map(t => t.term).join(', ')}`);
  console.log();
});
