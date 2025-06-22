import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Volume2, Copy, Check, Phone, Heart, Zap, Shield } from 'lucide-react';
import { getEmergencyPhrases, speakText } from '../services/awsService';

interface EmergencyPhrasesProps {
  sourceLanguage?: string;
  targetLanguage: string;
  largeButtons?: boolean;
  accessibilityMode?: boolean;
}

const EmergencyPhrases: React.FC<EmergencyPhrasesProps> = ({ 
  sourceLanguage = 'en',
  targetLanguage,
  largeButtons = false,
  accessibilityMode = false
}) => {
  const [emergencyPhrases, setEmergencyPhrases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPhrase, setCopiedPhrase] = useState<number | null>(null);
  const [speakingPhrase, setSpeakingPhrase] = useState<number | null>(null);
  const [lastUsedPhrases, setLastUsedPhrases] = useState<number[]>([]);

  // Priority emergency phrases - always visible at top
  const criticalPhrases = useMemo(() => [
    {
      id: 'emergency-call',
      category: 'Critical Emergency',
      english: 'CALL 911 IMMEDIATELY - MEDICAL EMERGENCY',
      icon: Phone,
      color: '#ff4757',
      severity: 'critical',
      priority: 1
    },
    {
      id: 'unconscious',
      category: 'Critical Emergency',
      english: 'Patient is unconscious and not breathing',
      icon: AlertTriangle,
      color: '#ff4757',
      severity: 'critical',
      priority: 2
    },
    {
      id: 'chest-pain',
      category: 'Critical Emergency',
      english: 'Severe chest pain - possible heart attack',
      icon: Heart,
      color: '#ff4757',
      severity: 'critical',
      priority: 3
    },
    {
      id: 'stroke',
      category: 'Critical Emergency',
      english: 'Signs of stroke - face drooping, speech difficulty',
      icon: Zap,
      color: '#ff4757',
      severity: 'critical',
      priority: 4
    }
  ], []);

  // Emergency phrases grouped by category
  const emergencyCategories = useMemo(() => ({
    'Critical Emergency': {
      color: '#ff4757',
      icon: AlertTriangle,
      phrases: criticalPhrases
    },
    'Pain Assessment': {
      color: '#ff6b35',
      icon: Heart,
      phrases: [
        { id: 'pain-location', english: 'Where exactly does it hurt?', severity: 'high' },
        { id: 'pain-scale', english: 'Rate your pain from 1 to 10', severity: 'high' },
        { id: 'pain-duration', english: 'How long have you had this pain?', severity: 'medium' },
        { id: 'pain-type', english: 'Is the pain sharp, dull, or throbbing?', severity: 'medium' }
      ]
    },
    'Medical History': {
      color: '#3742fa',
      icon: Shield,
      phrases: [
        { id: 'allergies', english: 'Do you have any allergies to medications?', severity: 'high' },
        { id: 'medications', english: 'What medications are you currently taking?', severity: 'high' },
        { id: 'medical-conditions', english: 'Do you have any chronic medical conditions?', severity: 'medium' },
        { id: 'emergency-contact', english: 'Who should we contact in case of emergency?', severity: 'medium' }
      ]
    },
    'Vital Signs': {
      color: '#2ed573',
      icon: Heart,
      phrases: [
        { id: 'breathing-difficulty', english: 'Are you having trouble breathing?', severity: 'high' },
        { id: 'feel-dizzy', english: 'Do you feel dizzy or lightheaded?', severity: 'medium' },
        { id: 'nausea', english: 'Are you feeling nauseous or like vomiting?', severity: 'medium' },
        { id: 'temperature', english: 'Do you have a fever or feel hot?', severity: 'low' }
      ]
    }
  }), [criticalPhrases]);

  // Fallback phrases in case backend fails
  const fallbackPhrases = useMemo(() => [
    { id: 1, category: 'Critical Emergency', english: 'MEDICAL EMERGENCY - CALL 911', severity: 'critical' },
    { id: 2, category: 'Critical Emergency', english: 'Patient is unconscious', severity: 'critical' },
    { id: 3, category: 'Critical Emergency', english: 'Severe chest pain', severity: 'critical' },
    { id: 4, category: 'Critical Emergency', english: 'Difficulty breathing', severity: 'critical' },
    { id: 5, category: 'Pain Assessment', english: 'Where does it hurt?', severity: 'high' },
    { id: 6, category: 'Communication', english: 'I need help', severity: 'medium' }
  ], []);

  // Handle phrase usage for analytics and quick access
  const handlePhraseUsed = useCallback((phraseId: string | number) => {
    const id = typeof phraseId === 'string' ? parseInt(phraseId.toString()) : phraseId;
    setLastUsedPhrases(prev => {
      const updated = [id, ...prev.filter(p => p !== id)].slice(0, 5);
      return updated;
    });
  }, []);

  // Copy phrase to clipboard
  const copyToClipboard = useCallback(async (text: string, phraseId: string | number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPhrase(typeof phraseId === 'number' ? phraseId : 0);
      handlePhraseUsed(phraseId);
      
      if (accessibilityMode) {
        // Announce to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.textContent = `Phrase copied: ${text}`;
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }
      
      setTimeout(() => setCopiedPhrase(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [accessibilityMode, handlePhraseUsed]);

  // Speak phrase aloud
  const speakPhrase = useCallback(async (text: string, phraseId: string | number) => {
    setSpeakingPhrase(typeof phraseId === 'number' ? phraseId : 0);
    handlePhraseUsed(phraseId);
    
    try {
      await speakText(text, targetLanguage);
    } catch (error) {
      console.error('Failed to speak phrase:', error);
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLanguage;
        utterance.rate = accessibilityMode ? 0.8 : 1;
        speechSynthesis.speak(utterance);
      }
    } finally {
      setSpeakingPhrase(null);
    }
  }, [targetLanguage, accessibilityMode, handlePhraseUsed]);

  // Emergency phrase button component
  const EmergencyButton: React.FC<{
    phrase: any;
    categoryColor: string;
    Icon: any;
  }> = ({ phrase, categoryColor, Icon }) => {
    const isCurrentlyCopied = copiedPhrase === phrase.id;
    const isCurrentlySpeaking = speakingPhrase === phrase.id;
    const buttonSize = largeButtons ? 'large' : accessibilityMode ? 'accessible' : 'normal';
    
    return (
      <div 
        className={`emergency-phrase-button ${buttonSize} ${phrase.severity || 'medium'}`}
        style={{ borderLeftColor: categoryColor }}
        role="button"
        tabIndex={0}
        aria-label={`Emergency phrase: ${phrase.english}. Press Enter to copy, Space to speak.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            copyToClipboard(phrase.translated || phrase.english, phrase.id);
          } else if (e.key === ' ') {
            e.preventDefault();
            speakPhrase(phrase.translated || phrase.english, phrase.id);
          }
        }}
      >
        <div className="phrase-header">
          <Icon 
            className="phrase-icon" 
            style={{ color: categoryColor }}
            aria-hidden="true"
          />
          <div className="phrase-content">
            <div className="phrase-text">
              {phrase.translated || phrase.english}
            </div>
            {phrase.english !== phrase.translated && (
              <div className="phrase-original">
                Original: {phrase.english}
              </div>
            )}
          </div>
        </div>
        
        <div className="phrase-actions">
          <button
            className={`action-button copy ${isCurrentlyCopied ? 'success' : ''}`}
            onClick={() => copyToClipboard(phrase.translated || phrase.english, phrase.id)}
            aria-label={`Copy phrase: ${phrase.english}`}
            disabled={isCurrentlyCopied}
          >
            {isCurrentlyCopied ? <Check size={accessibilityMode ? 24 : 20} /> : <Copy size={accessibilityMode ? 24 : 20} />}
          </button>
          
          <button
            className={`action-button speak ${isCurrentlySpeaking ? 'speaking' : ''}`}
            onClick={() => speakPhrase(phrase.translated || phrase.english, phrase.id)}
            aria-label={`Speak phrase: ${phrase.english}`}
            disabled={isCurrentlySpeaking}
          >
            <Volume2 size={accessibilityMode ? 24 : 20} />
          </button>
        </div>
      </div>
    );
  };

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
    };    loadPhrases();  }, [targetLanguage, fallbackPhrases]);

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
                      {phrase.translated || phrase.english}
                    </div>
                  </div>

                  <div className="phrase-actions">                    <button
                      onClick={() => handleCopy(phrase.id, phrase.translated || phrase.english)}
                      className="action-button"
                      title="Copy translation"
                    >
                      {copiedPhrase === phrase.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>                    <button
                      onClick={() => handleSpeak(phrase.translated || phrase.english)}
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
