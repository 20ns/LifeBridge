import React, { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Thermometer, Phone, Clock, Activity, Volume2, Copy, Check, Play, Pause, RotateCcw, Brain, Shield, Zap } from 'lucide-react';
import { translateText, speakText } from '../services/awsService';
import { EMERGENCY_SCENARIOS, QUICK_ACTION_TEMPLATES, EmergencyScenario } from '../data/emergencyScenarios';
import '../styles/emergency-scenarios.css';

interface EmergencyScenarioWorkflowProps {
  sourceLanguage: string;
  targetLanguage: string;
  onPhraseSelect: (phrase: string) => void;
}

const EmergencyScenarioWorkflow: React.FC<EmergencyScenarioWorkflowProps> = ({
  sourceLanguage,
  targetLanguage,
  onPhraseSelect
}) => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [translatedPhrases, setTranslatedPhrases] = useState<{ [key: string]: string }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [workflowTimer, setWorkflowTimer] = useState<NodeJS.Timeout | null>(null);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Auto-translate phrases when scenario changes
  useEffect(() => {
    if (activeScenario && sourceLanguage !== targetLanguage) {
      translateScenarioPhrases();
    }
  }, [activeScenario, sourceLanguage, targetLanguage]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (workflowTimer) {
        clearInterval(workflowTimer);
      }
    };
  }, [workflowTimer]);

  const translateScenarioPhrases = async () => {
    const scenario = EMERGENCY_SCENARIOS.find(s => s.id === activeScenario);
    if (!scenario) return;

    setIsTranslating(true);
    const translations: { [key: string]: string } = {};

    try {
      // Translate main phrases
      for (const phrase of scenario.phrases) {
        const result = await translateText(phrase, sourceLanguage, targetLanguage);
        translations[phrase] = result.translatedText;
      }

      // Translate quick action phrases
      for (const [category, actions] of Object.entries(scenario.quickActions)) {
        for (const action of actions) {
          const result = await translateText(action, sourceLanguage, targetLanguage);
          translations[action] = result.translatedText;
        }
      }

      // Translate communication flow phrases
      for (const step of scenario.communicationFlow) {
        for (const phrase of step.phrases) {
          const result = await translateText(phrase, sourceLanguage, targetLanguage);
          translations[phrase] = result.translatedText;
        }
      }

      setTranslatedPhrases(translations);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleScenarioSelect = (scenarioId: string) => {
    setActiveScenario(scenarioId);
    setActiveWorkflowStep(0);
    setCompletedSteps([]);
    setIsWorkflowRunning(false);
    if (workflowTimer) {
      clearInterval(workflowTimer);
      setWorkflowTimer(null);
    }
  };

  const handlePhraseClick = async (phrase: string) => {
    onPhraseSelect(phrase);
    
    // Auto-speak if translation available
    const translatedPhrase = translatedPhrases[phrase] || phrase;
    try {
      await speakText(translatedPhrase, targetLanguage);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const handleCopyPhrase = async (phrase: string) => {
    const translatedPhrase = translatedPhrases[phrase] || phrase;
    try {
      await navigator.clipboard.writeText(translatedPhrase);
      setCopiedPhrase(phrase);
      setTimeout(() => setCopiedPhrase(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const startWorkflow = () => {
    const scenario = EMERGENCY_SCENARIOS.find(s => s.id === activeScenario);
    if (!scenario) return;

    setIsWorkflowRunning(true);
    setActiveWorkflowStep(0);
    setCompletedSteps([]);

    // Auto-advance through workflow steps
    const timer = setInterval(() => {
      setActiveWorkflowStep(current => {
        const next = current + 1;
        if (next >= scenario.communicationFlow.length) {
          clearInterval(timer);
          setIsWorkflowRunning(false);
          return current;
        }
        return next;
      });
    }, 15000); // 15 seconds per step

    setWorkflowTimer(timer);
  };

  const stopWorkflow = () => {
    if (workflowTimer) {
      clearInterval(workflowTimer);
      setWorkflowTimer(null);
    }
    setIsWorkflowRunning(false);
  };

  const resetWorkflow = () => {
    stopWorkflow();
    setActiveWorkflowStep(0);
    setCompletedSteps([]);
  };

  const markStepCompleted = (stepIndex: number) => {
    setCompletedSteps(prev => [...prev, stepIndex]);
  };

  const activeScenarioData = EMERGENCY_SCENARIOS.find(s => s.id === activeScenario);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'urgent': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'moderate': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };
  return (
    <div className="emergency-container">
      <div className="emergency-header">
        <h1 className="flex items-center justify-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          Emergency Scenario Workflows
        </h1>
      </div>

      <div className="emergency-alert-banner">
        🚨 MEDICAL EMERGENCY TRANSLATION SYSTEM - FOR HEALTHCARE PROFESSIONALS ONLY
      </div>

      <div className="workflow-section">
        <div className="flex items-center justify-between mb-6">
        {isTranslating && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm">Translating...</span>
          </div>
        )}
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {EMERGENCY_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => handleScenarioSelect(scenario.id)}
            className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
              activeScenario === scenario.id
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {scenario.icon}
              <div>
                <h4 className="font-semibold text-gray-900">{scenario.title}</h4>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(scenario.severity)}`}>
                  {scenario.severity.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
            <p className="text-xs text-red-600 font-medium">{scenario.timeframe}</p>
          </button>
        ))}
      </div>

      {/* Active Scenario Details */}
      {activeScenarioData && (
        <div className="space-y-6">
          {/* Scenario Header */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-red-800">
                {activeScenarioData.title} - Active Workflow
              </h4>
              <div className="flex gap-2">
                {!isWorkflowRunning ? (
                  <button
                    onClick={startWorkflow}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Workflow
                  </button>
                ) : (
                  <button
                    onClick={stopWorkflow}
                    className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Stop Workflow
                  </button>
                )}
                <button
                  onClick={resetWorkflow}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>

            {/* Critical Indicators */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <h6 className="font-medium text-red-700 mb-2">Critical Symptoms:</h6>
                <ul className="text-sm text-red-600 space-y-1">
                  {activeScenarioData.symptoms.map((symptom, index) => (
                    <li key={index}>• {symptom}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="font-medium text-red-700 mb-2">Critical Indicators:</h6>
                <ul className="text-sm text-red-600 space-y-1">
                  {activeScenarioData.criticalIndicators.map((indicator, index) => (
                    <li key={index}>• {indicator}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Communication Workflow */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Emergency Communication Workflow
            </h5>
            
            <div className="space-y-3">
              {activeScenarioData.communicationFlow.map((step, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    index === activeWorkflowStep && isWorkflowRunning
                      ? 'border-blue-500 bg-blue-100'
                      : completedSteps.includes(index)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium text-gray-800">
                      Step {step.step}: {step.action}
                    </h6>
                    <div className="flex gap-2">
                      {step.timeLimit && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          {step.timeLimit}
                        </span>
                      )}
                      <button
                        onClick={() => markStepCompleted(index)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          completedSteps.includes(index)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                        }`}
                      >
                        {completedSteps.includes(index) ? '✓ Done' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {step.phrases.map((phrase, phraseIndex) => (
                      <div
                        key={phraseIndex}
                        className="flex items-center justify-between bg-white p-2 rounded border"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{phrase}</div>
                          {translatedPhrases[phrase] && (
                            <div className="text-xs text-gray-600 mt-1">
                              {translatedPhrases[phrase]}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handlePhraseClick(phrase)}
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                            title="Use phrase"
                          >
                            <Play className="w-4 h-4 text-blue-600" />
                          </button>
                          
                          <button
                            onClick={() => handleCopyPhrase(phrase)}
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                            title="Copy translation"
                          >
                            {copiedPhrase === phrase ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => speakText(translatedPhrases[phrase] || phrase, targetLanguage)}
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                            title="Speak translation"
                          >
                            <Volume2 className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Phrases */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Phrases
            </h5>
            
            <div className="grid gap-2">
              {activeScenarioData.phrases.map((phrase, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white p-3 rounded border hover:bg-yellow-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{phrase}</div>
                    {translatedPhrases[phrase] && (
                      <div className="text-xs text-gray-600 mt-1">
                        {translatedPhrases[phrase]}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handlePhraseClick(phrase)}
                      className="p-2 hover:bg-yellow-100 rounded transition-colors"
                      title="Use phrase"
                    >
                      <Play className="w-4 h-4 text-yellow-600" />
                    </button>
                    
                    <button
                      onClick={() => handleCopyPhrase(phrase)}
                      className="p-2 hover:bg-yellow-100 rounded transition-colors"
                      title="Copy translation"
                    >
                      {copiedPhrase === phrase ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => speakText(translatedPhrases[phrase] || phrase, targetLanguage)}
                      className="p-2 hover:bg-yellow-100 rounded transition-colors"
                      title="Speak translation"
                    >
                      <Volume2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(activeScenarioData.quickActions).map(([category, actions]) => (
              <div key={category} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h6 className="font-medium text-gray-700 mb-3 capitalize flex items-center gap-2">
                  {category === 'assessment' && <Clock className="w-4 h-4 text-blue-600" />}
                  {category === 'treatment' && <Heart className="w-4 h-4 text-red-600" />}
                  {category === 'communication' && <Phone className="w-4 h-4 text-green-600" />}
                  {category}
                </h6>
                <div className="space-y-2">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handlePhraseClick(action)}
                      className="w-full text-left p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium">{action}</div>
                      {translatedPhrases[action] && (
                        <div className="text-xs text-gray-600 mt-1">
                          {translatedPhrases[action]}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contraindications Warning */}
          {activeScenarioData.contraindications.length > 0 && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <h6 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Critical Contraindications
              </h6>
              <ul className="text-sm text-red-700 space-y-1">
                {activeScenarioData.contraindications.map((contraindication, index) => (
                  <li key={index}>⚠️ {contraindication}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!activeScenario && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Select an Emergency Scenario</p>
          <p className="text-sm">Choose a medical emergency scenario above to access guided workflows and translated phrases.</p>
        </div>
      )}
    </div>
  );
};

export default EmergencyScenarioWorkflow;
