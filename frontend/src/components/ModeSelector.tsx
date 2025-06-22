import React from 'react';
import { MessageSquare, Mic, Hand, AlertTriangle } from 'lucide-react';

export type CommunicationMode = 'text' | 'speech' | 'sign' | 'emergency';

interface ModeSelectorProps {
  activeMode: CommunicationMode;
  isEmergencyMode: boolean;
  onSelectMode: (mode: CommunicationMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ activeMode, isEmergencyMode, onSelectMode }) => {
  return (
    <div className="mode-selector">
      {(['text', 'speech', 'sign'] as CommunicationMode[]).map(m => (
        <button
          key={m}
          className={`mode-tab ${activeMode === m ? 'active' : ''}`}
          onClick={() => onSelectMode(m)}
          aria-pressed={activeMode === m}
        >
          {m === 'text' && <MessageSquare className="mode-icon" />}
          {m === 'speech' && <Mic className="mode-icon" />}
          {m === 'sign' && <Hand className="mode-icon" />}
          <span>{m.charAt(0).toUpperCase() + m.slice(1)}</span>
        </button>
      ))}
      {isEmergencyMode && (
        <button
          className={`mode-tab emergency-tab ${activeMode === 'emergency' ? 'active' : ''}`}
          onClick={() => onSelectMode('emergency')}
          aria-pressed={activeMode === 'emergency'}
        >
          <AlertTriangle className="mode-icon" />
          <span>EMERGENCY</span>
        </button>
      )}
    </div>
  );
};

export default ModeSelector; 