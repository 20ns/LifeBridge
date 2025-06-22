import React from 'react';
import { Smartphone } from 'lucide-react';
import ConnectionIndicator from './ConnectionIndicator';
import { ConnectionQuality } from '../hooks/useConnectionQuality';

interface InterfaceHeaderProps {
  connectionQuality: ConnectionQuality;
  isEmergencyMode: boolean;
  onTogglePerformance: () => void;
  onToggleEmergency: () => void;
}

const InterfaceHeader: React.FC<InterfaceHeaderProps> = ({
  connectionQuality,
  isEmergencyMode,
  onTogglePerformance,
  onToggleEmergency,
}) => (
  <div className="interface-header">
    <div className="header-left">
      <ConnectionIndicator connectionQuality={connectionQuality} />
      {/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
        <Smartphone className="device-indicator" />
      )}
    </div>
    <div className="header-center">
      <h2>LifeBridge Communication</h2>
    </div>
    <div className="header-right">
      <button className="performance-toggle" onClick={onTogglePerformance}>
        ⚙️
      </button>
      <button
        className={`emergency-toggle ${isEmergencyMode ? 'active' : ''}`}
        onClick={onToggleEmergency}
        aria-pressed={isEmergencyMode}
      >
        🚨
      </button>
    </div>
  </div>
);

export default InterfaceHeader; 