import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { ConnectionQuality } from '../hooks/useConnectionQuality';
import './ConnectionIndicator.css';

interface Props {
  connectionQuality: ConnectionQuality;
}

const ConnectionIndicator: React.FC<Props> = ({ connectionQuality }) => {
  const getStatusDescription = (status: string, latency: number) => {
    switch (status) {
      case 'excellent':
        return `Excellent connection, ${latency} milliseconds latency`;
      case 'good':
        return `Good connection, ${latency} milliseconds latency`;
      case 'poor':
        return `Poor connection, ${latency} milliseconds latency`;
      case 'offline':
        return 'No internet connection';
      default:
        return `Connection status: ${status}, ${latency} milliseconds latency`;
    }
  };

  const statusDescription = getStatusDescription(connectionQuality.status, connectionQuality.latency);

  return (
    <div 
      className={`connection-indicator ${connectionQuality.status}`}
      role="status"
      aria-label={statusDescription}
    >
      {connectionQuality.status === 'offline' ? (
        <WifiOff 
          className="connection-icon" 
          aria-hidden="true"
        />
      ) : (
        <Wifi 
          className="connection-icon" 
          aria-hidden="true"
        />
      )}
      <div className="connection-details">
        <span className="connection-status" aria-hidden="true">
          {connectionQuality.status}
        </span>
        <span className="connection-latency" aria-hidden="true">
          {connectionQuality.latency}ms
        </span>
      </div>
      <div 
        className={`connection-strength-bar ${connectionQuality.status}`}
        role="progressbar"
        aria-valuenow={connectionQuality.strength}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Connection strength: ${connectionQuality.strength} percent`}
      >
        <div 
          className="strength-fill" 
          style={{ width: `${connectionQuality.strength}%` }}
          aria-hidden="true"
        />
      </div>
      
      {/* Screen reader only description */}
      <span className="sr-only">
        {statusDescription}. Connection strength: {connectionQuality.strength} percent.
      </span>
    </div>
  );
};

export default ConnectionIndicator;