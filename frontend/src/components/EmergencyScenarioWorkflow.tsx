import React, { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Thermometer, Phone, Clock, Activity, Volume2, Copy, Check } from 'lucide-react';
import { translateText, speakText } from '../services/awsService';

interface EmergencyScenario {
  id: string;
  category: 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'pediatric' | 'obstetric';
  severity: 'critical' | 'urgent' | 'moderate';
  icon: React.ReactNode;
  title: string;
  phrases: string[];
  quickActions: {
    assessment: string[];
    treatment: string[];
    communication: string[];
  };
}

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

  // Emergency scenarios with medical workflows
  const emergencyScenarios: EmergencyScenario[] = [
    {
      id: 'cardiac-arrest',
      category: 'cardiac',
      severity: 'critical',
      icon: <Heart className="w-6 h-6 text-red-500" />,
      title: 'Cardiac Emergency',
      phrases: [
        "Patient is unresponsive and not breathing normally",
        "Starting CPR immediately",
        "Call emergency services now",
        "Patient has chest pain radiating to left arm",
        "Pulse is weak and irregular",
        "Blood pressure is critically low"
      ],
      quickActions: {
        assessment: [
          "Check pulse and breathing",
          "Assess level of consciousness",
          "Monitor vital signs",
          "Check for chest pain severity"
        ],
        treatment: [
          "Begin CPR if no pulse",
          "Prepare AED if available",
          "Give aspirin if conscious and no allergies",
          "Elevate legs if hypotensive"
        ],
        communication: [
          "Patient needs immediate cardiac care",
          "ETA for ambulance?",
          "Contact cardiologist on call",
          "Prepare for emergency transport"
        ]
      }
    },
    {
      id: 'respiratory-distress',
      category: 'respiratory',
      severity: 'urgent',
      icon: <Activity className="w-6 h-6 text-blue-500" />,
      title: 'Respiratory Emergency',
      phrases: [
        "Patient has severe difficulty breathing",
        "Respiratory rate is very high",
        "Oxygen saturation is low",
        "Patient cannot speak in full sentences",
        "Using accessory muscles to breathe",
        "Wheezing and shortness of breath"
      ],
      quickActions: {
        assessment: [
          "Check oxygen saturation",
          "Count respiratory rate",
          "Listen to lung sounds",
          "Assess for cyanosis"
        ],
        treatment: [
          "Administer oxygen immediately",
          "Position upright or tripod",
          "Prepare bronchodilator if asthma",
          "Consider epinephrine if anaphylaxis"
        ],
        communication: [
          "Patient needs respiratory support",
          "Prepare intubation equipment",
          "Contact pulmonologist",
          "Alert respiratory therapy"
        ]
      }
    },
    {
      id: 'stroke-symptoms',
      category: 'neurological',
      severity: 'critical',
      icon: <Thermometer className="w-6 h-6 text-purple-500" />,
      title: 'Stroke/Neurological Emergency',
      phrases: [
        "Patient shows signs of stroke",
        "Facial drooping on one side",
        "Arm weakness or numbness",
        "Speech is slurred or confused",
        "Sudden severe headache",
        "Loss of balance or coordination"
      ],
      quickActions: {
        assessment: [
          "Perform FAST stroke assessment",
          "Check blood glucose level",
          "Assess neurological status",
          "Note time of symptom onset"
        ],
        treatment: [
          "Keep patient calm and still",
          "Monitor airway and breathing",
          "Nothing by mouth",
          "Prepare for immediate transport"
        ],
        communication: [
          "Stroke alert activated",
          "Time of onset was [TIME]",
          "Contact stroke team immediately",
          "Prepare for CT scan"
        ]
      }
    },
    {
      id: 'pediatric-emergency',
      category: 'pediatric',
      severity: 'urgent',
      icon: <Heart className="w-6 h-6 text-pink-500" />,
      title: 'Pediatric Emergency',
      phrases: [
        "Child is having difficulty breathing",
        "High fever with altered consciousness",
        "Seizure activity in progress",
        "Child is not responding normally",
        "Severe dehydration signs",
        "Possible poisoning or ingestion"
      ],
      quickActions: {
        assessment: [
          "Check pediatric vital signs",
          "Assess hydration status",
          "Look for rash or bruising",
          "Check fontanelle if infant"
        ],
        treatment: [
          "Use age-appropriate equipment",
          "Calculate medication doses by weight",
          "Maintain body temperature",
          "Comfort and calm the child"
        ],
        communication: [
          "Pediatric emergency team needed",
          "Child weighs approximately [WEIGHT] kg",
          "Parents/guardians are present",
          "Contact pediatrician on call"
        ]
      }
    }
  ];

  // Translate phrases for selected scenario
  const translateScenarioPhrases = async (scenario: EmergencyScenario) => {
    setIsTranslating(true);
    const allPhrases = [
      ...scenario.phrases,
      ...scenario.quickActions.assessment,
      ...scenario.quickActions.treatment,
      ...scenario.quickActions.communication
    ];

    const translations: { [key: string]: string } = {};
    
    try {
      for (const phrase of allPhrases) {
        const result = await translateText(phrase, sourceLanguage, targetLanguage, 'emergency');
        translations[phrase] = result.translatedText;
      }
      
      setTranslatedPhrases(translations);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle scenario selection
  const handleScenarioSelect = (scenarioId: string) => {
    setActiveScenario(scenarioId);
    const scenario = emergencyScenarios.find(s => s.id === scenarioId);
    if (scenario) {
      translateScenarioPhrases(scenario);
    }
  };

  // Handle phrase selection and speaking
  const handlePhraseClick = async (phrase: string) => {
    const translatedPhrase = translatedPhrases[phrase] || phrase;
    onPhraseSelect(translatedPhrase);
    
    // Auto-speak the translated phrase
    try {
      await speakText(translatedPhrase, targetLanguage);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  // Copy phrase to clipboard
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

  const activeScenarioData = emergencyScenarios.find(s => s.id === activeScenario);

  return (
    <div className="emergency-scenario-workflow">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Emergency Scenario Workflows
        </h3>
        
        {/* Scenario Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {emergencyScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleScenarioSelect(scenario.id)}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${activeScenario === scenario.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                }
                ${scenario.severity === 'critical' ? 'border-red-400' : 
                  scenario.severity === 'urgent' ? 'border-orange-400' : 'border-yellow-400'}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                {scenario.icon}
                <span className="font-medium">{scenario.title}</span>
                <span className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${scenario.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    scenario.severity === 'urgent' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'}
                `}>
                  {scenario.severity}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Scenario Details */}
      {activeScenarioData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            {activeScenarioData.icon}
            <h4 className="text-xl font-semibold">{activeScenarioData.title}</h4>
            {isTranslating && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Translating...</span>
              </div>
            )}
          </div>

          {/* Emergency Phrases */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-700 mb-3">Key Emergency Phrases</h5>
            <div className="grid gap-2">
              {activeScenarioData.phrases.map((phrase, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <button
                    onClick={() => handlePhraseClick(phrase)}
                    className="flex-1 text-left hover:bg-red-100 p-2 rounded transition-colors"
                  >
                    <div className="font-medium text-gray-800">{phrase}</div>
                    {translatedPhrases[phrase] && (
                      <div className="text-gray-600 mt-1 italic">
                        {translatedPhrases[phrase]}
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleCopyPhrase(phrase)}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
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
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                    title="Speak translation"
                  >
                    <Volume2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Workflow */}
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(activeScenarioData.quickActions).map(([category, actions]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg">
                <h6 className="font-medium text-gray-700 mb-3 capitalize flex items-center gap-2">
                  {category === 'assessment' && <Clock className="w-4 h-4" />}
                  {category === 'treatment' && <Heart className="w-4 h-4" />}
                  {category === 'communication' && <Phone className="w-4 h-4" />}
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
        </div>
      )}
    </div>
  );
};

export default EmergencyScenarioWorkflow;
