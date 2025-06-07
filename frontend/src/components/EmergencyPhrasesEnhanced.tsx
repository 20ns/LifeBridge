import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Volume2, Copy, Check, Phone, Heart, Zap, Shield, Clock } from 'lucide-react';
import { getEmergencyPhrases, speakText } from '../services/awsService';
import './EmergencyPhrasesEnhanced.css';

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
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
  const [speakingPhrase, setSpeakingPhrase] = useState<string | null>(null);
  const [lastUsedPhrases, setLastUsedPhrases] = useState<string[]>([]);

  // Critical emergency phrases - always at top
  const criticalPhrases = useMemo(() => [
    {
      id: 'emergency-911',
      category: 'Critical Emergency',
      english: 'CALL 911 IMMEDIATELY - MEDICAL EMERGENCY',
      translated: 'CALL 911 IMMEDIATELY - MEDICAL EMERGENCY',
      icon: Phone,
      severity: 'critical',
      priority: 1
    },
    {
      id: 'unconscious',
      category: 'Critical Emergency',
      english: 'Patient is unconscious and not breathing',
      translated: 'Patient is unconscious and not breathing',
      icon: AlertTriangle,
      severity: 'critical',
      priority: 2
    },
    {
      id: 'chest-pain',
      category: 'Critical Emergency',
      english: 'Severe chest pain - possible heart attack',
      translated: 'Severe chest pain - possible heart attack',
      icon: Heart,
      severity: 'critical',
      priority: 3
    },
    {
      id: 'stroke-signs',
      category: 'Critical Emergency',
      english: 'Signs of stroke - face drooping, speech difficulty',
      translated: 'Signs of stroke - face drooping, speech difficulty',
      icon: Zap,
      severity: 'critical',
      priority: 4
    }
  ], []);

  // Emergency categories with phrases
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
        { 
          id: 'pain-location', 
          english: 'Where exactly does it hurt?', 
          translated: 'Where exactly does it hurt?',
          severity: 'high' 
        },
        { 
          id: 'pain-scale', 
          english: 'Rate your pain from 1 to 10', 
          translated: 'Rate your pain from 1 to 10',
          severity: 'high' 
        },
        { 
          id: 'pain-duration', 
          english: 'How long have you had this pain?', 
          translated: 'How long have you had this pain?',
          severity: 'medium' 
        },
        { 
          id: 'pain-type', 
          english: 'Is the pain sharp, dull, or throbbing?', 
          translated: 'Is the pain sharp, dull, or throbbing?',
          severity: 'medium' 
        }
      ]
    },
    'Medical History': {
      color: '#3742fa',
      icon: Shield,
      phrases: [
        { 
          id: 'allergies', 
          english: 'Do you have any allergies to medications?', 
          translated: 'Do you have any allergies to medications?',
          severity: 'high' 
        },
        { 
          id: 'medications', 
          english: 'What medications are you currently taking?', 
          translated: 'What medications are you currently taking?',
          severity: 'high' 
        },
        { 
          id: 'medical-conditions', 
          english: 'Do you have any chronic medical conditions?', 
          translated: 'Do you have any chronic medical conditions?',
          severity: 'medium' 
        },
        { 
          id: 'emergency-contact', 
          english: 'Who should we contact in case of emergency?', 
          translated: 'Who should we contact in case of emergency?',
          severity: 'medium' 
        }
      ]
    },
    'Vital Signs': {
      color: '#2ed573',
      icon: Heart,
      phrases: [
        { 
          id: 'breathing-difficulty', 
          english: 'Are you having trouble breathing?', 
          translated: 'Are you having trouble breathing?',
          severity: 'high' 
        },
        { 
          id: 'feel-dizzy', 
          english: 'Do you feel dizzy or lightheaded?', 
          translated: 'Do you feel dizzy or lightheaded?',
          severity: 'medium' 
        },
        { 
          id: 'nausea', 
          english: 'Are you feeling nauseous or like vomiting?', 
          translated: 'Are you feeling nauseous or like vomiting?',
          severity: 'medium' 
        },
        { 
          id: 'temperature', 
          english: 'Do you have a fever or feel hot?', 
          translated: 'Do you have a fever or feel hot?',
          severity: 'low' 
        }
      ]
    }
  }), [criticalPhrases]);

  // Handle phrase usage tracking
  const handlePhraseUsed = useCallback((phraseId: string) => {
    setLastUsedPhrases(prev => {
      const updated = [phraseId, ...prev.filter(p => p !== phraseId)].slice(0, 5);
      return updated;
    });
  }, []);

  // Copy phrase to clipboard with accessibility support
  const copyToClipboard = useCallback(async (text: string, phraseId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPhrase(phraseId);
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

  // Speak phrase with fallback options
  const speakPhrase = useCallback(async (text: string, phraseId: string) => {
    setSpeakingPhrase(phraseId);
    handlePhraseUsed(phraseId);
    
    try {
      await speakText(text, targetLanguage);
    } catch (error) {
      console.error('AWS speech failed, using browser fallback:', error);
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLanguage;
        utterance.rate = accessibilityMode ? 0.8 : 1.0;
        utterance.volume = 1.0;
        speechSynthesis.speak(utterance);
      }
    } finally {
      setTimeout(() => setSpeakingPhrase(null), 3000);
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
        className={`emergency-phrase-button ${buttonSize} severity-${phrase.severity || 'medium'}`}
        style={{ borderLeftColor: categoryColor }}
        role="button"
        tabIndex={0}
        aria-label={`Emergency phrase: ${phrase.english}. Press Enter to copy, Space to speak.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
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
            <div className={`phrase-text ${largeButtons ? 'large-text' : ''}`}>
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
            {isCurrentlyCopied ? 
              <Check size={largeButtons ? 28 : accessibilityMode ? 24 : 20} /> : 
              <Copy size={largeButtons ? 28 : accessibilityMode ? 24 : 20} />
            }
          </button>
          
          <button
            className={`action-button speak ${isCurrentlySpeaking ? 'speaking' : ''}`}
            onClick={() => speakPhrase(phrase.translated || phrase.english, phrase.id)}
            aria-label={`Speak phrase: ${phrase.english}`}
            disabled={isCurrentlySpeaking}
          >
            <Volume2 size={largeButtons ? 28 : accessibilityMode ? 24 : 20} />
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
        // Use built-in phrases as fallback
        const allPhrases = Object.values(emergencyCategories).flatMap(category => category.phrases);
        setEmergencyPhrases(allPhrases);
      } finally {
        setLoading(false);
      }
    };

    loadPhrases();
  }, [targetLanguage, emergencyCategories]);

  if (loading) {
    return (
      <div className={`emergency-phrases ${largeButtons ? 'large-layout' : ''} ${accessibilityMode ? 'accessible-layout' : ''}`}>
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

  return (
    <div className={`emergency-phrases ${largeButtons ? 'large-layout' : ''} ${accessibilityMode ? 'accessible-layout' : ''}`}>
      <div className="emergency-header">
        <AlertTriangle className="emergency-icon" />
        <h2>Emergency Medical Phrases</h2>
        <p>Pre-translated emergency phrases ready for immediate use</p>
        
        {/* Quick access to recently used phrases */}
        {lastUsedPhrases.length > 0 && (
          <div className="recently-used">
            <Clock className="recent-icon" />
            <span>Recently Used: {lastUsedPhrases.length} phrases</span>
          </div>
        )}
      </div>

      <div className={`phrases-container ${largeButtons ? 'large-buttons' : ''}`}>
        {Object.entries(emergencyCategories).map(([categoryName, category]) => (
          <div key={categoryName} className="phrase-category">
            <div className="category-header" style={{ borderColor: category.color }}>
              <category.icon 
                className="category-icon" 
                style={{ color: category.color }}
                size={largeButtons ? 32 : 24}
              />
              <h3 className={`category-title ${largeButtons ? 'large-title' : ''}`}>
                {categoryName}
              </h3>
            </div>
            
            <div className={`phrases-grid ${largeButtons ? 'large-grid' : ''}`}>
              {category.phrases.map((phrase: any) => (
                <EmergencyButton
                  key={phrase.id}
                  phrase={phrase}
                  categoryColor={category.color}
                  Icon={phrase.icon || category.icon}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Emergency contact button */}
      <div className="emergency-contact">
        <button 
          className={`emergency-contact-button ${largeButtons ? 'large' : ''}`}
          onClick={() => {
            if (window.confirm('Do you want to call emergency services (911)?')) {
              window.location.href = 'tel:911';
            }
          }}
          aria-label="Call emergency services"
        >
          <Phone size={largeButtons ? 32 : 24} />
          <span className={largeButtons ? 'large-text' : ''}>CALL 911</span>
        </button>
      </div>
    </div>
  );
};

export default EmergencyPhrases;
