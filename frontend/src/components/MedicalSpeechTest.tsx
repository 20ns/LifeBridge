import React, { useState, useEffect } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, RotateCcw, Download, Activity } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { translateText } from '../services/awsService';
import '../App.css';

interface TestPhrase {
  id: string;
  category: 'anatomy' | 'symptoms' | 'medications' | 'procedures' | 'emergency';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  phrase: string;
  expectedTerms: string[];
  pronunciation: string;
}

interface TestResult {
  phraseId: string;
  recognizedText: string;
  accuracy: number;
  correctTerms: string[];
  missedTerms: string[];
  timestamp: Date;
  confidence: number;
}

const MedicalSpeechTest: React.FC = () => {
  const [testPhrases] = useState<TestPhrase[]>([
    // Basic Anatomy
    {
      id: 'anat-1',
      category: 'anatomy',
      difficulty: 'basic',
      phrase: 'The patient has pain in the abdomen and chest',
      expectedTerms: ['abdomen', 'chest', 'pain'],
      pronunciation: '/ˈæbdəmən/ /tʃest/ /peɪn/'
    },
    {
      id: 'anat-2',
      category: 'anatomy',
      difficulty: 'intermediate',
      phrase: 'Examination reveals hepatomegaly and splenomegaly',
      expectedTerms: ['hepatomegaly', 'splenomegaly', 'examination'],
      pronunciation: '/ˌhɛpətoʊˈmɛɡəli/ /ˌsplinəˈmɛɡəli/'
    },
    
    // Symptoms
    {
      id: 'symp-1',
      category: 'symptoms',
      difficulty: 'basic',
      phrase: 'Patient presents with dyspnea and tachycardia',
      expectedTerms: ['dyspnea', 'tachycardia', 'patient'],
      pronunciation: '/dɪspˈniə/ /ˌtækɪˈkɑrdiə/'
    },
    {
      id: 'symp-2',
      category: 'symptoms',
      difficulty: 'advanced',
      phrase: 'Symptoms include paresthesia and hyperesthesia',
      expectedTerms: ['paresthesia', 'hyperesthesia', 'symptoms'],
      pronunciation: '/ˌpærəsˈθiziə/ /ˌhaɪpərəsˈθiziə/'
    },
    
    // Medications
    {
      id: 'med-1',
      category: 'medications',
      difficulty: 'intermediate',
      phrase: 'Administer acetaminophen and ibuprofen as needed',
      expectedTerms: ['acetaminophen', 'ibuprofen', 'administer'],
      pronunciation: '/əˌsitəˈmɪnəfən/ /ˌaɪbjuˈproʊfən/'
    },
    {
      id: 'med-2',
      category: 'medications',
      difficulty: 'advanced',
      phrase: 'Patient is taking metformin and hydrochlorothiazide',
      expectedTerms: ['metformin', 'hydrochlorothiazide', 'taking'],
      pronunciation: '/mɛtˈfɔrmɪn/ /ˌhaɪdroʊˌklɔroʊˈθaɪəzaɪd/'
    },
    
    // Procedures
    {
      id: 'proc-1',
      category: 'procedures',
      difficulty: 'intermediate',
      phrase: 'Perform electrocardiogram and echocardiogram',
      expectedTerms: ['electrocardiogram', 'echocardiogram', 'perform'],
      pronunciation: '/ɪˌlɛktroʊˈkɑrdioʊˌɡræm/ /ˌɛkoʊˈkɑrdioʊˌɡræm/'
    },
    
    // Emergency
    {
      id: 'emrg-1',
      category: 'emergency',
      difficulty: 'basic',
      phrase: 'Code blue in the emergency department',
      expectedTerms: ['code blue', 'emergency department'],
      pronunciation: '/koʊd blu/ /ɪˈmɜrdʒənsi dɪˈpɑrtmənt/'
    },
    {
      id: 'emrg-2',
      category: 'emergency',
      difficulty: 'advanced',
      phrase: 'Patient in anaphylactic shock requires epinephrine',
      expectedTerms: ['anaphylactic', 'shock', 'epinephrine'],
      pronunciation: '/ˌænəfəˈlæktɪk/ /ʃɑk/ /ˌɛpəˈnɛfrɪn/'
    }
  ]);

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestActive, setIsTestActive] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const {
    isRecording,
    transcript,
    confidence,
    error,
    startRecording,
    stopRecording
  } = useSpeechRecognition({
    language: 'en-US',
    onTranscript: () => {}, // We'll handle transcript in useEffect
    medicalContext: 'general',
    realTimeMode: false,
    voiceActivityDetection: true
  });

  const filteredPhrases = testPhrases.filter(phrase => {
    const categoryMatch = filterCategory === 'all' || phrase.category === filterCategory;
    const difficultyMatch = filterDifficulty === 'all' || phrase.difficulty === filterDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const currentPhrase = filteredPhrases[currentPhraseIndex];

  // Calculate accuracy when transcript changes
  useEffect(() => {
    if (transcript && isTestActive && currentPhrase) {
      calculateAccuracy();
    }
  }, [transcript, isTestActive, currentPhrase]);

  const calculateAccuracy = () => {
    if (!transcript || !currentPhrase) return;

    const recognizedLower = transcript.toLowerCase();
    const correctTerms: string[] = [];
    const missedTerms: string[] = [];

    currentPhrase.expectedTerms.forEach(term => {
      const termLower = term.toLowerCase();
      if (recognizedLower.includes(termLower)) {
        correctTerms.push(term);
      } else {
        missedTerms.push(term);
      }
    });

    const accuracy = correctTerms.length / currentPhrase.expectedTerms.length;

    const result: TestResult = {
      phraseId: currentPhrase.id,
      recognizedText: transcript,
      accuracy,
      correctTerms,
      missedTerms,
      timestamp: new Date(),
      confidence: confidence || 0
    };

    setTestResults(prev => [...prev, result]);
    setIsTestActive(false);
  };
  const startTest = () => {
    setIsTestActive(true);
    startRecording();
  };

  const stopTest = () => {
    setIsTestActive(false);
    stopRecording();
  };

  const nextPhrase = () => {
    if (currentPhraseIndex < filteredPhrases.length - 1) {
      setCurrentPhraseIndex(currentPhraseIndex + 1);
    } else {
      setCurrentPhraseIndex(0);
    }
  };

  const resetTest = () => {
    setTestResults([]);
    setCurrentPhraseIndex(0);
    setIsTestActive(false);
  };

  const exportResults = () => {
    const resultsData = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.length,
      averageAccuracy: testResults.reduce((sum, r) => sum + r.accuracy, 0) / testResults.length,
      averageConfidence: testResults.reduce((sum, r) => sum + r.confidence, 0) / testResults.length,
      results: testResults
    };

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-speech-test-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return 'text-green-600';
    if (accuracy >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'anatomy': return '🫀';
      case 'symptoms': return '🤒';
      case 'medications': return '💊';
      case 'procedures': return '🏥';
      case 'emergency': return '🚨';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎤 Medical Speech Recognition Accuracy Test
        </h2>
        <p className="text-gray-600">
          Test the accuracy of speech recognition with medical terminology
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPhraseIndex(0);
            }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">All Categories</option>
            <option value="anatomy">Anatomy</option>
            <option value="symptoms">Symptoms</option>
            <option value="medications">Medications</option>
            <option value="procedures">Procedures</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <select
            value={filterDifficulty}
            onChange={(e) => {
              setFilterDifficulty(e.target.value);
              setCurrentPhraseIndex(0);
            }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">All Levels</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Current Test Phrase */}
      {currentPhrase && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(currentPhrase.category)}</span>
              <span className="font-medium capitalize">{currentPhrase.category}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                currentPhrase.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
                currentPhrase.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {currentPhrase.difficulty}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {currentPhraseIndex + 1} / {filteredPhrases.length}
            </span>
          </div>

          <div className="mb-3">
            <h3 className="font-medium text-gray-800 mb-1">Phrase to speak:</h3>
            <p className="text-lg font-medium text-blue-800">
              "{currentPhrase.phrase}"
            </p>
          </div>

          <div className="mb-3">
            <h4 className="font-medium text-gray-700 mb-1">Key terms to recognize:</h4>
            <div className="flex flex-wrap gap-2">
              {currentPhrase.expectedTerms.map((term, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>

          {currentPhrase.pronunciation && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Pronunciation guide:</h4>
              <p className="text-sm text-gray-600 font-mono">
                {currentPhrase.pronunciation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recording Controls */}
      <div className="mb-6 flex items-center justify-center gap-4">        {!isTestActive ? (
          <button
            onClick={startTest}
            className="speech-recording-btn"
            disabled={!currentPhrase}
          >
            <Mic size={20} />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopTest}
            className="speech-recording-btn recording"
          >
            <MicOff size={20} />
            Stop Recording
          </button>
        )}

        <button
          onClick={nextPhrase}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isTestActive}
        >
          Next Phrase
        </button>

        <button
          onClick={resetTest}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isTestActive}
        >
          <RotateCcw size={16} />
          Reset Test
        </button>
      </div>

      {/* Recording Status */}
      {(isRecording || transcript) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`${isRecording ? 'text-red-500 animate-pulse' : 'text-green-500'}`} size={16} />
            <span className="font-medium">
              {isRecording ? 'Recording...' : 'Recording Complete'}
            </span>
            {confidence && (
              <span className="text-sm text-gray-600">
                (Confidence: {Math.round(confidence * 100)}%)
              </span>
            )}
          </div>
          
          {transcript && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Recognized text:</h4>
              <p className="text-gray-800 bg-white p-2 rounded border">
                {transcript}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-2 text-red-600 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      )}

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Test Results Summary</h3>
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {testResults.length}
              </div>
              <div className="text-sm text-gray-600">Tests Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((testResults.reduce((sum, r) => sum + r.accuracy, 0) / testResults.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Average Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((testResults.reduce((sum, r) => sum + r.confidence, 0) / testResults.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Average Confidence</div>
            </div>
          </div>

          {/* Individual Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.slice(-5).reverse().map((result, index) => {
              const phrase = testPhrases.find(p => p.id === result.phraseId);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getCategoryIcon(phrase?.category || '')}</span>
                      <span className="text-sm font-medium truncate">
                        {phrase?.phrase.substring(0, 40)}...
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Recognized: "{result.recognizedText.substring(0, 50)}..."
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getAccuracyColor(result.accuracy)}`}>
                      {Math.round(result.accuracy * 100)}%
                    </span>
                    {result.accuracy >= 0.9 ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalSpeechTest;
