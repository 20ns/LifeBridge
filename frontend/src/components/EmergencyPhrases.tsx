import React, { useState, useEffect } from 'react';
import { AlertTriangle, Volume2, Copy, Check } from 'lucide-react';
import { getEmergencyPhrases, speakText } from '../services/awsService';

interface EmergencyPhrasesProps {
  targetLanguage: string;
}

const EmergencyPhrases: React.FC<EmergencyPhrasesProps> = ({ targetLanguage }) => {
  const [emergencyPhrases, setEmergencyPhrases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPhrase, setCopiedPhrase] = useState<number | null>(null);

  // Load emergency phrases from backend
  useEffect(() => {
    const loadPhrases = async () => {
      setLoading(true);
      try {
        const phrases = await getEmergencyPhrases(targetLanguage);
        setEmergencyPhrases(phrases);
      } catch (error) {
        console.error('Failed to load emergency phrases:', error);
        // Fallback to hardcoded phrases if backend fails
        setEmergencyPhrases(fallbackPhrases);
      } finally {
        setLoading(false);
      }
    };

    loadPhrases();
  }, [targetLanguage]);

  // Fallback phrases if backend is unavailable
  const fallbackPhrases = [
    {
      id: 1,
      category: 'Emergency',
      english: 'Call an ambulance immediately!',
      translated: 'Call an ambulance immediately!',
      severity: 'critical'
    },
    {
      id: 2,
      category: 'Pain Assessment', 
      english: 'Where does it hurt?',
      translated: 'Where does it hurt?',
      severity: 'high'
    },
    {
      id: 3,
      category: 'Pain Assessment',
      english: 'Rate your pain from 1 to 10',
      translated: 'Rate your pain from 1 to 10',
      severity: 'medium'
    },
    {
      id: 4,
      category: 'Medical History',
      english: 'Do you have any allergies?',
      translated: 'Do you have any allergies?',
      severity: 'high'
    },
    {
      id: 5,
      category: 'Medical History',
      english: 'Are you taking any medications?',
      translated: 'Are you taking any medications?',
      severity: 'high'
    }
  ];
  const handleCopy = async (phraseId: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPhrase(phraseId);
      setTimeout(() => setCopiedPhrase(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      await speakText(text, targetLanguage);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLanguage;
        speechSynthesis.speak(utterance);
      }
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

  if (loading) {
    return (
      <div className="emergency-phrases">
        <div className="emergency-header">
          <AlertTriangle className="emergency-icon" />
          <h2>Emergency Medical Phrases</h2>
          <p>Loading emergency phrases...</p>
        </div>
        <div className="phrases-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const groupedPhrases = emergencyPhrases.reduce((acc: {[key: string]: any[]}, phrase: any) => {
    if (!acc[phrase.category]) {
      acc[phrase.category] = [];
    }
    acc[phrase.category].push(phrase);
    return acc;
  }, {});

  return (
    <div className="emergency-phrases">
      <div className="emergency-header">
        <AlertTriangle className="emergency-icon" />
        <h2>Emergency Medical Phrases</h2>
        <p>Pre-translated emergency phrases ready for immediate use</p>
      </div>

      <div className="phrases-grid">
        {Object.entries(groupedPhrases).map(([category, phrases]) => (
          <div key={category} className="phrase-category">
            <h3 className="category-title">{category}</h3>
            <div className="phrases-list">
              {phrases.map((phrase: any) => (
                <div 
                  key={phrase.id} 
                  className={`phrase-card ${getSeverityClass(phrase.severity)}`}
                >
                  <div className="phrase-content">
                    <div className="phrase-english">
                      {phrase.english}
                    </div>
                    
                    <div className="phrase-translated">
                      {phrase.translated || phrase.text}
                    </div>
                  </div>

                  <div className="phrase-actions">
                    <button
                      onClick={() => handleCopy(phrase.id, phrase.translated || phrase.text)}
                      className="action-button"
                      title="Copy translation"
                    >
                      {copiedPhrase === phrase.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleSpeak(phrase.translated || phrase.text)}
                      className="action-button"
                      title="Speak translation"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
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
