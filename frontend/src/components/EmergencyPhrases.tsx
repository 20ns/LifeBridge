import React, { useState } from 'react';
import { AlertTriangle, Volume2, Copy, Check } from 'lucide-react';
import { translateText } from '../services/awsService';

interface EmergencyPhrasesProps {
  targetLanguage: string;
}

const emergencyPhrases = [
  {
    id: 1,
    category: 'Emergency',
    english: 'Call an ambulance immediately!',
    severity: 'critical'
  },
  {
    id: 2,
    category: 'Pain Assessment',
    english: 'Where does it hurt?',
    severity: 'high'
  },
  {
    id: 3,
    category: 'Pain Assessment',
    english: 'Rate your pain from 1 to 10',
    severity: 'medium'
  },
  {
    id: 4,
    category: 'Medical History',
    english: 'Do you have any allergies?',
    severity: 'high'
  },
  {
    id: 5,
    category: 'Medical History',
    english: 'Are you taking any medications?',
    severity: 'high'
  },
  {
    id: 6,
    category: 'Symptoms',
    english: 'When did the symptoms start?',
    severity: 'medium'
  },
  {
    id: 7,
    category: 'Emergency',
    english: 'Are you having trouble breathing?',
    severity: 'critical'
  },
  {
    id: 8,
    category: 'Vital Signs',
    english: 'I need to check your blood pressure',
    severity: 'medium'
  },
  {
    id: 9,
    category: 'Communication',
    english: 'Please stay calm, we are here to help',
    severity: 'low'
  },
  {
    id: 10,
    category: 'Emergency',
    english: 'Do you have chest pain?',
    severity: 'critical'
  }
];

const EmergencyPhrases: React.FC<EmergencyPhrasesProps> = ({ targetLanguage }) => {
  const [translatedPhrases, setTranslatedPhrases] = useState<{[key: number]: string}>({});
  const [loadingPhrases, setLoadingPhrases] = useState<{[key: number]: boolean}>({});
  const [copiedPhrase, setCopiedPhrase] = useState<number | null>(null);

  const translatePhrase = async (phrase: typeof emergencyPhrases[0]) => {
    if (translatedPhrases[phrase.id]) return;

    setLoadingPhrases(prev => ({ ...prev, [phrase.id]: true }));
    
    try {
      const result = await translateText(phrase.english, 'en', targetLanguage);
      setTranslatedPhrases(prev => ({ ...prev, [phrase.id]: result.translatedText }));
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedPhrases(prev => ({ ...prev, [phrase.id]: 'Translation failed' }));
    } finally {
      setLoadingPhrases(prev => ({ ...prev, [phrase.id]: false }));
    }
  };

  const handleCopy = async (phraseId: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPhrase(phraseId);
      setTimeout(() => setCopiedPhrase(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLanguage;
      speechSynthesis.speak(utterance);
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return '';
    }
  };

  const groupedPhrases = emergencyPhrases.reduce((acc, phrase) => {
    if (!acc[phrase.category]) {
      acc[phrase.category] = [];
    }
    acc[phrase.category].push(phrase);
    return acc;
  }, {} as {[key: string]: typeof emergencyPhrases});

  return (
    <div className="emergency-phrases">
      <div className="emergency-header">
        <AlertTriangle className="emergency-icon" />
        <h2>Emergency Medical Phrases</h2>
        <p>Click any phrase to translate and use immediately</p>
      </div>

      <div className="phrases-grid">
        {Object.entries(groupedPhrases).map(([category, phrases]) => (
          <div key={category} className="phrase-category">
            <h3 className="category-title">{category}</h3>
            <div className="phrases-list">
              {phrases.map(phrase => (
                <div 
                  key={phrase.id} 
                  className={`phrase-card ${getSeverityClass(phrase.severity)}`}
                  onClick={() => translatePhrase(phrase)}
                >
                  <div className="phrase-content">
                    <div className="phrase-english">
                      {phrase.english}
                    </div>
                    
                    {loadingPhrases[phrase.id] ? (
                      <div className="phrase-loading">
                        <div className="spinner-small"></div>
                        <span>Translating...</span>
                      </div>
                    ) : translatedPhrases[phrase.id] ? (
                      <div className="phrase-translated">
                        {translatedPhrases[phrase.id]}
                      </div>
                    ) : (
                      <div className="phrase-prompt">
                        Click to translate
                      </div>
                    )}
                  </div>

                  {translatedPhrases[phrase.id] && (
                    <div className="phrase-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(phrase.id, translatedPhrases[phrase.id]);
                        }}
                        className="action-button"
                        title="Copy translation"
                      >
                        {copiedPhrase === phrase.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak(translatedPhrases[phrase.id]);
                        }}
                        className="action-button"
                        title="Speak translation"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmergencyPhrases;
