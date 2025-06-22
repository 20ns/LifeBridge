import React from 'react';
import { Globe, ArrowRightLeft } from 'lucide-react';

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
    onSourceChange(targetLanguage);
    onTargetChange(sourceLanguage);
  };

  return (
    <div className="language-selector">
      <div className="language-pair">
        <div className="language-dropdown">
          <Globe size={16} />
          <select 
            value={sourceLanguage} 
            onChange={(e) => onSourceChange(e.target.value)}
            className="language-select"
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
        >
          <ArrowRightLeft size={16} />
        </button>

        <div className="language-dropdown">
          <Globe size={16} />
          <select 
            value={targetLanguage} 
            onChange={(e) => onTargetChange(e.target.value)}
            className="language-select"
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
