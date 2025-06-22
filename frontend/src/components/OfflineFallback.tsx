import React from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';
import './OfflineFallback.css';

const OfflineFallback: React.FC = () => (
  <div className="offline-fallback">
    <WifiOff className="offline-icon" />
    <div className="offline-content">
      <h3>Connection Lost</h3>
      <p>Using cached translations and offline features</p>
      <button className="retry-connection-button" onClick={() => window.location.reload()}>
        <RotateCcw className="button-icon" /> Retry Connection
      </button>
    </div>
  </div>
);

export default OfflineFallback; 