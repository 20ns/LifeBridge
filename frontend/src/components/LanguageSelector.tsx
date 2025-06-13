import React from 'react';
import { Globe, ArrowRightLeft } from 'lucide-react';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceChange: (language: string) => void;
  onTargetChange: (language: string) => void;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' }
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange
}) => {
  const swapLanguages = () => {
    // Add visual feedback for swap action
    const swapButton = document.querySelector('.swap-button');
    if (swapButton) {
      swapButton.classList.add('swapping');
      setTimeout(() => {
        swapButton.classList.remove('swapping');
      }, 600);
    }
    
    onSourceChange(targetLanguage);
    onTargetChange(sourceLanguage);
  };

  const handleLanguageChange = (type: 'source' | 'target', value: string) => {
    const selector = document.querySelector(`.language-select.${type}`);
    if (selector) {
      selector.classList.add('changing');
      setTimeout(() => {
        selector.classList.remove('changing');
      }, 300);
    }
    
    if (type === 'source') {
      onSourceChange(value);
    } else {
      onTargetChange(value);
    }
  };

  return (
    <div className="language-selector">
      <div className="language-pair">
        <div className="language-dropdown source">
          <Globe size={20} />
          <select 
            value={sourceLanguage} 
            onChange={(e) => handleLanguageChange('source', e.target.value)}
            className="language-select source"
            aria-label="Source language"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={swapLanguages}
          className="swap-button"
          title="Swap languages"
          aria-label="Swap source and target languages"
        >
          <ArrowRightLeft size={18} />
        </button>

        <div className="language-dropdown target">
          <Globe size={20} />
          <select 
            value={targetLanguage} 
            onChange={(e) => handleLanguageChange('target', e.target.value)}
            className="language-select target"
            aria-label="Target language"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
