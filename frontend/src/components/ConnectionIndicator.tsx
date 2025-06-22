import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { ConnectionQuality } from '../hooks/useConnectionQuality';
import './ConnectionIndicator.css';

interface Props {
  connectionQuality: ConnectionQuality;
}

const ConnectionIndicator: React.FC<Props> = ({ connectionQuality }) => (
  <div className={`connection-indicator ${connectionQuality.status}`}>
    {connectionQuality.status === 'offline' ? (
      <WifiOff className="connection-icon" />
    ) : (
      <Wifi className="connection-icon" />
    )}
    <div className="connection-details">
      <span className="connection-status">{connectionQuality.status}</span>
      <span className="connection-latency">{connectionQuality.latency}ms</span>
    </div>
    <div className={`connection-strength-bar ${connectionQuality.status}`}>
      <div className="strength-fill" style={{ width: `${connectionQuality.strength}%` }} />
    </div>
  </div>
);

export default ConnectionIndicator; 