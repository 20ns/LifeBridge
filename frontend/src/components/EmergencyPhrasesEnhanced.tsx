import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Volume2, Copy, Check, Phone, Heart, Zap, Shield, Clock, LucideProps } from 'lucide-react'; // Added LucideProps
import { speakText, translateText } from '../services/awsService'; // Import translateText, remove getEmergencyPhrases
import '../styles/emergency-themes.css';
import './EmergencyPhrasesEnhanced.css';

// Define clear types for displayed phrases and categories
interface DisplayedPhrase {
  id: string;
  english: string;
  translated: string;
  severity: string;
  icon?: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>; // Optional
  priority?: number;          // Optional
  categoryName?: string;      // To know which category it belongs to
}

interface CategoryWithDisplayedPhrases {
  color: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>; // Category's own icon
  phrases: DisplayedPhrase[];
}

interface EmergencyPhrasesProps {
  sourceLanguage?: string;
  targetLanguage: string;
  largeButtons?: boolean;
  accessibilityMode?: boolean;
  isEmergencyMode?: boolean;
  currentTheme?: 'light' | 'dark' | 'high-contrast';
  textSize?: 'normal' | 'large' | 'extra-large';
}

const EmergencyPhrases: React.FC<EmergencyPhrasesProps> = ({ 
  sourceLanguage = 'en',
  targetLanguage,
  largeButtons = false,
  accessibilityMode = false,
  isEmergencyMode = false,
  currentTheme = 'light',
  textSize = 'normal'
}) => {
  // const [emergencyPhrases, setEmergencyPhrases] = useState<any[]>([]); // Remove unused state
  const [loading, setLoading] = useState(true); // Global loading for initial English setup
  const [categoryLoadingStates, setCategoryLoadingStates] = useState<Record<string, boolean>>({});
  const [categoryErrorStates, setCategoryErrorStates] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [translatedCategoriesForCurrentLang, setTranslatedCategoriesForCurrentLang] = useState<Set<string>>(new Set());
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
    
    // Map severity to emergency button classes
    const getEmergencyButtonClass = (severity: string) => {
      switch (severity) {
        case 'critical': return 'emergency-btn-critical';
        case 'urgent': return 'emergency-btn-urgent';
        case 'high': return 'emergency-btn-urgent';
        default: return 'emergency-btn-primary';
      }
    };
    
    return (
      <div 
        className={`emergency-card emergency-focus-visible ${getEmergencyButtonClass(phrase.severity || 'medium')} ${buttonSize} severity-${phrase.severity || 'medium'}`}
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
            className={`emergency-btn-secondary emergency-action-btn ${isCurrentlyCopied ? 'success' : ''}`}
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
            className={`emergency-btn-secondary emergency-action-btn ${isCurrentlySpeaking ? 'speaking' : ''}`}
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

  const [displayedCategories, setDisplayedCategories] = useState<Record<string, CategoryWithDisplayedPhrases>>({});
  const criticalCategoryKey = 'Critical Emergency'; // Define this once
  // Helper function to translate phrases for a single category if needed
  const translateSingleCategoryIfNeeded = useCallback(async (categoryKey: string) => {
    // Type assertion for categoryKey when indexing emergencyCategories
    const currentEmergencyCategory = emergencyCategories[categoryKey as keyof typeof emergencyCategories];

    // Don't re-translate if already done for the current language combination or if category data is missing
    if (translatedCategoriesForCurrentLang.has(categoryKey) || !displayedCategories[categoryKey] || !currentEmergencyCategory) {
      return;
    }

    // Ensure we are translating the original English phrases from emergencyCategories
    const originalPhrases = currentEmergencyCategory.phrases;

    setCategoryLoadingStates(prev => ({ ...prev, [categoryKey]: true }));
    setCategoryErrorStates(prev => ({ ...prev, [categoryKey]: false }));

    const translatedCategoryPhrases: DisplayedPhrase[] = [];
    let anErrorOccurred = false;

    for (const phrase of originalPhrases) { // Iterate over original English phrases
      try {
        // Increased delay to prevent rate limiting - 2.5 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 2500));
        const translationResult = await translateText(phrase.english, sourceLanguage, targetLanguage, 'emergency');
        // Construct the DisplayedPhrase object correctly
        translatedCategoryPhrases.push({
            id: phrase.id,
            english: phrase.english,
            translated: translationResult.translatedText,
            severity: phrase.severity, // Ensure all fields are present
            icon: (phrase as any).icon, // Cast if icon is not strictly on type but present in data
            priority: (phrase as any).priority,
            categoryName: categoryKey
        });
      } catch (err) {
        console.error(`Failed to translate phrase "${phrase.english}" for category "${categoryKey}":`, err);
        translatedCategoryPhrases.push({
            id: phrase.id,
            english: phrase.english,
            translated: phrase.english, // Fallback to English
            severity: phrase.severity,
            icon: (phrase as any).icon,
            priority: (phrase as any).priority,
            categoryName: categoryKey
        });
        anErrorOccurred = true;
      }
    }

    setDisplayedCategories(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], phrases: translatedCategoryPhrases },
    }));
    setCategoryLoadingStates(prev => ({ ...prev, [categoryKey]: false }));
    if (anErrorOccurred) {
      setCategoryErrorStates(prev => ({ ...prev, [categoryKey]: true }));
    } else {
      setTranslatedCategoriesForCurrentLang(prev => new Set(prev).add(categoryKey));
    }
  }, [
    targetLanguage,
    sourceLanguage,
    translateText,
    emergencyCategories,
    // displayedCategories, // Removed to break update loop
    // translatedCategoriesForCurrentLang, // Removed to break update loop
    // State setters are stable and can be included if ESLint requires, but are not the cause of the loop.
    // The function will close over displayedCategories and translatedCategoriesForCurrentLang
    // from the render cycle triggered by primary dependency changes (e.g., targetLanguage).
    setCategoryLoadingStates,
    setCategoryErrorStates,
    setDisplayedCategories,
    setTranslatedCategoriesForCurrentLang
  ]);


  useEffect(() => {
    setLoading(true);
    const initialDisplaySetup: Record<string, CategoryWithDisplayedPhrases> = {};
    for (const catKey in emergencyCategories) {
      const sourceCat = emergencyCategories[catKey as keyof typeof emergencyCategories];
      initialDisplaySetup[catKey] = {
        ...sourceCat,
        phrases: sourceCat.phrases.map((p: any) => ({
          id: p.id,
          english: p.english,
          translated: p.english, // Start with English
          severity: p.severity,
          icon: p.icon,
          priority: p.priority,
          categoryName: catKey,
        })),
      };
    }
    setDisplayedCategories(initialDisplaySetup);
    
    setTranslatedCategoriesForCurrentLang(new Set());
    setExpandedCategories({ [criticalCategoryKey]: true });
    setCategoryLoadingStates({});
    setCategoryErrorStates({});
    setLoading(false);

    if (targetLanguage !== sourceLanguage && targetLanguage && initialDisplaySetup[criticalCategoryKey]) {
      translateSingleCategoryIfNeeded(criticalCategoryKey);
    } else if (initialDisplaySetup[criticalCategoryKey]) {
      setTranslatedCategoriesForCurrentLang(prev => new Set(prev).add(criticalCategoryKey));
    }

  }, [targetLanguage, sourceLanguage, emergencyCategories, translateSingleCategoryIfNeeded]);


  const handleToggleCategory = (categoryKey: string) => {
    const isCurrentlyExpanded = !!expandedCategories[categoryKey];
    const isExpanding = !isCurrentlyExpanded;

    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: isExpanding,
    }));

    if (isExpanding && targetLanguage !== sourceLanguage && targetLanguage) {
      if (!translatedCategoriesForCurrentLang.has(categoryKey) && !categoryLoadingStates[categoryKey]) {
         translateSingleCategoryIfNeeded(categoryKey);
      }
    }
  };

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
    <div className={`emergency-container ${isEmergencyMode ? 'emergency-mode' : ''} ${
      currentTheme === 'dark' ? 'emergency-theme-dark' : 
      currentTheme === 'high-contrast' ? 'emergency-theme-high-contrast' : 
      'emergency-theme-light'
    } size-${textSize} ${largeButtons ? 'large-layout' : ''} ${accessibilityMode ? 'accessible-layout' : ''}`}>
      <div className="emergency-header emergency-section">
        <AlertTriangle className="emergency-icon" />
        <h2>Emergency Medical Phrases</h2>
        <p>Pre-translated emergency phrases ready for immediate use</p>
        
        {/* Quick access to recently used phrases */}
        {lastUsedPhrases.length > 0 && (
          <div className="recently-used emergency-status emergency-status-info">
            <Clock className="recent-icon" />
            <span>Recently Used: {lastUsedPhrases.length} phrases</span>
          </div>
        )}
      </div>      <div className={`emergency-grid emergency-grid-2 emergency-section ${largeButtons ? 'large-buttons' : ''}`}>
        {Object.entries(displayedCategories).map(([categoryName, category]) => {
          const isExpanded = !!expandedCategories[categoryName];
          const isLoadingCategory = !!categoryLoadingStates[categoryName];
          const hasErrorInCategory = !!categoryErrorStates[categoryName];

          return (
            <div key={categoryName} className="phrase-category emergency-section">
              <div
                className="category-header emergency-status emergency-status-info"
                style={{ borderColor: category.color, cursor: 'pointer' }}
                onClick={() => handleToggleCategory(categoryName)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`category-content-${categoryName}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleCategory(categoryName); }}}
              >
                <category.icon
                  className="category-icon"
                  style={{ color: category.color }}
                  size={largeButtons ? 32 : 24}
                />
                <h3 className={`category-title ${largeButtons ? 'large-title' : ''}`}>
                  {categoryName}
                </h3>
                {isLoadingCategory && (
                  <div className="loading-indicator">
                    <div className="spinner-small" aria-label="Loading category..."></div>
                    <span>Translating...</span>
                  </div>
                )}
                {hasErrorInCategory && !isLoadingCategory && (
                  <div className="error-indicator" title="Some translations failed, showing English fallback">
                    ⚠️
                  </div>
                )}
                <span className="category-toggle-icon" aria-hidden="true">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
              
              {isExpanded && (
                <div
                  id={`category-content-${categoryName}`}
                  className={`emergency-grid emergency-grid-1 ${largeButtons ? 'large-grid' : ''} category-phrases-content`}
                >
                  {category.phrases.map((phrase: any) => (
                    <EmergencyButton
                      key={phrase.id}
                      phrase={phrase}
                      categoryColor={category.color}
                      Icon={phrase.icon || category.icon}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>      {/* Emergency contact button */}
      <div className="emergency-section emergency-contact">
        <button 
          className={`emergency-btn-critical emergency-contact-button emergency-pulse ${largeButtons ? 'large' : ''}`}
          onClick={() => {
            if (window.confirm('Do you want to call emergency services (911)?')) {
              window.location.href = 'tel:911';
            }
          }}
          aria-label="Call emergency services - Critical emergency action"
        >
          <Phone size={largeButtons ? 32 : 24} />
          <span className={largeButtons ? 'large-text' : ''}>CALL 911</span>
        </button>
      </div>
    </div>
  );
};

export default EmergencyPhrases;
