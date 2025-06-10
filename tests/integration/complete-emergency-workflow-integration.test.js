/**
 * Complete Emergency Workflow Integration Tests
 * Tests full end-to-end workflows for all emergency scenarios
 */

const { translateText, speakText } = require('../../backend/src/services/bedrock');
const { EMERGENCY_SCENARIOS } = require('../../frontend/src/data/emergencyScenarios');

describe('Complete Emergency Workflow Integration Tests', () => {
  let mockTranslationResults = {};
  let mockSpeechResults = {};

  beforeEach(() => {
    // Reset mocks
    mockTranslationResults = {};
    mockSpeechResults = {};
    
    // Mock translation service
    jest.mock('../../backend/src/services/bedrock', () => ({
      translateText: jest.fn((text, sourceLang, targetLang) => {
        const key = `${text}-${sourceLang}-${targetLang}`;
        mockTranslationResults[key] = `[${targetLang.toUpperCase()}] ${text}`;
        return Promise.resolve({
          translatedText: mockTranslationResults[key],
          confidence: 0.95
        });
      }),
      speakText: jest.fn((text, language) => {
        const key = `${text}-${language}`;
        mockSpeechResults[key] = `Speaking: ${text} in ${language}`;
        return Promise.resolve(mockSpeechResults[key]);
      })
    }));
  });

  // Test 1: Complete Heart Attack Workflow
  describe('Heart Attack Emergency - Complete Workflow', () => {
    const heartAttackScenario = EMERGENCY_SCENARIOS.find(s => s.id === 'heart-attack');

    test('should execute complete heart attack communication flow', async () => {
      const testLanguages = { source: 'en', target: 'es' };
      
      // Simulate complete workflow execution
      for (let stepIndex = 0; stepIndex < heartAttackScenario.communicationFlow.length; stepIndex++) {
        const step = heartAttackScenario.communicationFlow[stepIndex];
        
        console.log(`\n=== STEP ${step.step}: ${step.action} ===`);
        console.log(`Time Limit: ${step.timeLimit || 'No limit'}`);
        
        // Test each phrase in the step
        for (const phrase of step.phrases) {
          const translationResult = await translateText(phrase, testLanguages.source, testLanguages.target);
          expect(translationResult.translatedText).toContain('[ES]');
          
          const speechResult = await speakText(translationResult.translatedText, testLanguages.target);
          expect(speechResult).toContain('Speaking:');
          
          console.log(`  Original: ${phrase}`);
          console.log(`  Translated: ${translationResult.translatedText}`);
          console.log(`  Speech: ${speechResult}`);
        }
        
        // Simulate step completion
        expect(step.step).toBe(stepIndex + 1);
      }
      
      // Verify all critical components were covered
      expect(heartAttackScenario.communicationFlow).toHaveLength(6);
      console.log(`\n✅ Heart Attack workflow completed successfully with ${heartAttackScenario.communicationFlow.length} steps`);
    });

    test('should handle rapid-fire emergency phrases translation', async () => {
      const criticalPhrases = [
        "URGENT: Patient having heart attack - call emergency services immediately",
        "Severe crushing chest pain, feels like elephant on chest",
        "Pain spreading to left arm and jaw"
      ];
      
      const startTime = Date.now();
      
      // Simulate rapid translation of critical phrases
      const translationPromises = criticalPhrases.map(phrase => 
        translateText(phrase, 'en', 'es')
      );
      
      const results = await Promise.all(translationPromises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.translatedText).toContain('[ES]');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
      
      // Performance check - should be fast for emergency use
      expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds
      console.log(`⚡ Critical phrases translated in ${endTime - startTime}ms`);
    });
  });

  // Test 2: Complete Stroke Workflow with FAST Assessment
  describe('Stroke Emergency - FAST Assessment Workflow', () => {
    const strokeScenario = EMERGENCY_SCENARIOS.find(s => s.id === 'stroke-symptoms');

    test('should execute FAST assessment protocol', async () => {
      const fastStep = strokeScenario.communicationFlow.find(step => 
        step.action.includes('FAST Assessment')
      );
      
      expect(fastStep).toBeDefined();
      console.log(`\n=== FAST ASSESSMENT PROTOCOL ===`);
      
      const fastPhrases = [
        'Can you smile? Show me your teeth',
        'Raise both arms above your head',
        'Can you repeat this phrase: "The sky is blue"',
        'What time did symptoms start?'
      ];
      
      for (const phrase of fastPhrases) {
        const translation = await translateText(phrase, 'en', 'fr');
        const speech = await speakText(translation.translatedText, 'fr');
        
        console.log(`  FAST Test: ${phrase}`);
        console.log(`  French: ${translation.translatedText}`);
        console.log(`  Audio: ${speech}`);
        
        expect(translation.translatedText).toContain('[FR]');
      }
      
      console.log(`✅ FAST assessment protocol completed`);
    });

    test('should prioritize time-critical communication', () => {
      const timeStep = strokeScenario.communicationFlow.find(step =>
        step.phrases.some(phrase => phrase.includes('time'))
      );
      
      expect(timeStep).toBeDefined();
      expect(timeStep.timeLimit).toBe('30 seconds');
      
      // Time-critical phrases should be first priority
      const timeCriticalPhrases = strokeScenario.phrases.filter(phrase =>
        phrase.toLowerCase().includes('time') || phrase.toLowerCase().includes('urgent')
      );
      
      expect(timeCriticalPhrases.length).toBeGreaterThan(0);
      console.log(`⏱️ Time-critical phrases identified: ${timeCriticalPhrases.length}`);
    });
  });

  // Test 3: Anaphylaxis Emergency - Critical Intervention Workflow
  describe('Anaphylaxis Emergency - Critical Intervention', () => {
    const anaphylaxisScenario = EMERGENCY_SCENARIOS.find(s => s.id === 'anaphylaxis');

    test('should prioritize epinephrine administration', async () => {
      const epiStep = anaphylaxisScenario.communicationFlow.find(step =>
        step.action.includes('Epinephrine')
      );
      
      expect(epiStep).toBeDefined();
      expect(epiStep.timeLimit).toBe('Immediate');
      
      console.log(`\n=== ANAPHYLAXIS CRITICAL INTERVENTION ===`);
      
      const criticalActions = [
        'Give epinephrine auto-injector now',
        'Patient having severe allergic reaction - anaphylaxis',
        'Airway is swelling, patient cannot breathe normally'
      ];
      
      for (const action of criticalActions) {
        const translation = await translateText(action, 'en', 'de');
        console.log(`  Critical: ${action}`);
        console.log(`  German: ${translation.translatedText}`);
      }
      
      // Verify epinephrine is in quick actions
      expect(anaphylaxisScenario.quickActions.treatment).toContain('Give epinephrine auto-injector');
      console.log(`💉 Epinephrine intervention protocol ready`);
    });

    test('should handle airway emergency communication', async () => {
      const airwayPhrases = anaphylaxisScenario.phrases.filter(phrase =>
        phrase.toLowerCase().includes('airway') || phrase.toLowerCase().includes('breathe')
      );
      
      expect(airwayPhrases.length).toBeGreaterThan(0);
      
      for (const phrase of airwayPhrases) {
        const translation = await translateText(phrase, 'en', 'zh');
        expect(translation.translatedText).toContain('[ZH]');
        console.log(`  Airway Alert: ${phrase} -> ${translation.translatedText}`);
      }
    });
  });

  // Test 4: Trauma Emergency - Systematic Assessment
  describe('Trauma Emergency - Systematic Assessment Workflow', () => {
    const traumaScenario = EMERGENCY_SCENARIOS.find(s => s.id === 'trauma-emergency');

    test('should execute primary survey protocol', async () => {
      const primarySurvey = traumaScenario.communicationFlow.find(step =>
        step.action.includes('Primary Survey')
      );
      
      expect(primarySurvey).toBeDefined();
      console.log(`\n=== TRAUMA PRIMARY SURVEY ===`);
      
      const abcdeProtocol = [
        'Check airway, breathing, circulation',
        'Assess disability and neurological function',
        'Expose and examine for injuries'
      ];
      
      for (const check of abcdeProtocol) {
        const translation = await translateText(check, 'en', 'pt');
        console.log(`  Survey: ${check}`);
        console.log(`  Portuguese: ${translation.translatedText}`);
        
        expect(translation.translatedText).toContain('[PT]');
      }
      
      console.log(`🏥 Primary survey protocol completed`);
    });

    test('should enforce spinal immobilization warnings', () => {
      const spinalWarnings = traumaScenario.contraindications.filter(warning =>
        warning.toLowerCase().includes('spinal') || warning.toLowerCase().includes('move')
      );
      
      expect(spinalWarnings.length).toBeGreaterThan(0);
      
      spinalWarnings.forEach(warning => {
        console.log(`  ⚠️ CONTRAINDICATION: ${warning}`);
      });
      
      expect(spinalWarnings).toContain('Do not move patient unless immediate danger');
    });
  });

  // Test 5: Mental Health Crisis - De-escalation Workflow
  describe('Mental Health Crisis - De-escalation Communication', () => {
    const mentalHealthScenario = EMERGENCY_SCENARIOS.find(s => s.id === 'mental-health-crisis');

    test('should execute de-escalation communication protocol', async () => {
      const deEscalationStep = mentalHealthScenario.communicationFlow.find(step =>
        step.action.includes('De-escalation')
      );
      
      expect(deEscalationStep).toBeDefined();
      console.log(`\n=== MENTAL HEALTH DE-ESCALATION ===`);
      
      const calmingPhrases = [
        'I want to help you. You are safe here',
        'Can you tell me your name?',
        'Let\'s talk about what\'s happening'
      ];
      
      for (const phrase of calmingPhrases) {
        const translation = await translateText(phrase, 'en', 'ja');
        const speech = await speakText(translation.translatedText, 'ja');
        
        console.log(`  Calming: ${phrase}`);
        console.log(`  Japanese: ${translation.translatedText}`);
        
        expect(translation.translatedText).toContain('[JA]');
      }
      
      console.log(`🤝 De-escalation protocol ready`);
    });

    test('should assess suicide risk communication', () => {
      const riskAssessment = mentalHealthScenario.quickActions.assessment.filter(action =>
        action.toLowerCase().includes('suicide') || action.toLowerCase().includes('risk')
      );
      
      expect(riskAssessment.length).toBeGreaterThan(0);
      console.log(`🔍 Suicide risk assessment actions: ${riskAssessment.length}`);
    });
  });

  // Test 6: Respiratory Emergency - Airway Management
  describe('Respiratory Emergency - Airway Management Workflow', () => {
    const respiratoryScenario = EMERGENCY_SCENARIOS.find(s => s.id === 'respiratory-emergency');

    test('should prioritize oxygen administration', async () => {
      const oxygenStep = respiratoryScenario.communicationFlow.find(step =>
        step.action.includes('Oxygen')
      );
      
      expect(oxygenStep).toBeDefined();
      expect(oxygenStep.timeLimit).toBe('Immediate');
      
      console.log(`\n=== RESPIRATORY EMERGENCY MANAGEMENT ===`);
      
      const respiratoryActions = [
        'Patient cannot breathe - severe respiratory distress',
        'Give high-flow oxygen immediately',
        'Position patient upright for easier breathing'
      ];
      
      for (const action of respiratoryActions) {
        const translation = await translateText(action, 'en', 'ar');
        console.log(`  Respiratory: ${action}`);
        console.log(`  Arabic: ${translation.translatedText}`);
        
        expect(translation.translatedText).toContain('[AR]');
      }
      
      console.log(`💨 Respiratory management protocol ready`);
    });
  });

  // Integration Performance Tests
  describe('Complete Workflow Performance Tests', () => {
    test('should handle simultaneous multi-scenario workflows', async () => {
      const scenarios = ['heart-attack', 'stroke-symptoms', 'anaphylaxis'];
      const testLanguages = ['es', 'fr', 'de'];
      
      console.log(`\n=== MULTI-SCENARIO PERFORMANCE TEST ===`);
      const startTime = Date.now();
      
      const workflowPromises = scenarios.map(async (scenarioId, index) => {
        const scenario = EMERGENCY_SCENARIOS.find(s => s.id === scenarioId);
        const targetLang = testLanguages[index];
        
        // Translate first critical phrase from each scenario
        const firstPhrase = scenario.phrases[0];
        const translation = await translateText(firstPhrase, 'en', targetLang);
        
        return {
          scenarioId,
          targetLang,
          phrase: firstPhrase,
          translation: translation.translatedText
        };
      });
      
      const results = await Promise.all(workflowPromises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        console.log(`  Scenario: ${result.scenarioId} -> ${result.targetLang}`);
        console.log(`  Translation: ${result.translation}`);
      });
      
      console.log(`⚡ Multi-scenario test completed in ${endTime - startTime}ms`);
      expect(endTime - startTime).toBeLessThan(10000); // Under 10 seconds
    });

    test('should maintain translation accuracy under load', async () => {
      const testPhrase = "Patient having heart attack - call emergency services immediately";
      const iterations = 50;
      const targetLanguages = ['es', 'fr', 'de', 'pt', 'zh'];
      
      console.log(`\n=== TRANSLATION ACCURACY UNDER LOAD ===`);
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < iterations; i++) {
        const targetLang = targetLanguages[i % targetLanguages.length];
        promises.push(translateText(testPhrase, 'en', targetLang));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(iterations);
      results.forEach(result => {
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.translatedText).toBeTruthy();
      });
      
      console.log(`📊 ${iterations} translations completed in ${endTime - startTime}ms`);
      console.log(`📈 Average confidence: ${results.reduce((sum, r) => sum + r.confidence, 0) / results.length}`);
    });
  });

  // Complete System Integration Test
  describe('Complete Emergency System Integration', () => {
    test('should execute full emergency response simulation', async () => {
      console.log(`\n=== FULL EMERGENCY RESPONSE SIMULATION ===`);
      
      // Simulate incoming emergency call
      const emergencyCall = {
        type: 'heart-attack',
        patientLanguage: 'es',
        medicalLanguage: 'en',
        urgency: 'critical'
      };
      
      const scenario = EMERGENCY_SCENARIOS.find(s => s.id === emergencyCall.type);
      expect(scenario).toBeDefined();
      
      console.log(`🚨 Emergency Type: ${scenario.title}`);
      console.log(`🌍 Language Pair: ${emergencyCall.medicalLanguage} -> ${emergencyCall.patientLanguage}`);
      console.log(`⚠️ Urgency Level: ${emergencyCall.urgency}`);
      
      // Execute workflow steps
      for (let i = 0; i < Math.min(3, scenario.communicationFlow.length); i++) {
        const step = scenario.communicationFlow[i];
        console.log(`\n--- Step ${step.step}: ${step.action} ---`);
        
        // Translate and speak first phrase of each step
        const phrase = step.phrases[0];
        const translation = await translateText(phrase, emergencyCall.medicalLanguage, emergencyCall.patientLanguage);
        const speech = await speakText(translation.translatedText, emergencyCall.patientLanguage);
        
        console.log(`Medical Staff: ${phrase}`);
        console.log(`Patient Hears: ${translation.translatedText}`);
        console.log(`Audio Output: ${speech}`);
        
        expect(translation.translatedText).toContain('[ES]');
        expect(speech).toContain('Speaking:');
      }
      
      console.log(`\n✅ Emergency response simulation completed successfully`);
      console.log(`📋 Workflow covered ${Math.min(3, scenario.communicationFlow.length)} critical steps`);
    });
  });
});

module.exports = {
  // Export test utilities for reuse
  simulateEmergencyWorkflow: async (scenarioId, sourceLang, targetLang) => {
    const scenario = EMERGENCY_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
    
    const results = [];
    for (const step of scenario.communicationFlow) {
      for (const phrase of step.phrases) {
        const translation = await translateText(phrase, sourceLang, targetLang);
        results.push({
          step: step.step,
          action: step.action,
          originalPhrase: phrase,
          translatedPhrase: translation.translatedText,
          confidence: translation.confidence
        });
      }
    }
    
    return results;
  }
};
