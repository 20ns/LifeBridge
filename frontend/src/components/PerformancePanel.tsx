import React from 'react';
import { Monitor, Zap, Mic, Hand, Signal, WifiOff } from 'lucide-react';
import { PerformanceMetrics } from '../hooks/usePerformanceMetrics';
import './PerformancePanel.css';

interface Props {
  metrics: PerformanceMetrics;
  visible: boolean;
  offlineMode: boolean;
  onClose: () => void;
}

const PerformancePanel: React.FC<Props> = ({ metrics, visible, offlineMode, onClose }) => (
  <div className={`performance-panel ${visible ? 'visible' : 'hidden'}`}>
    <div className="performance-header">
      <Monitor className="performance-icon" />
      <span>Performance Metrics</span>
      <button className="close-button" onClick={onClose}>
        ×
      </button>
    </div>
    <div className="performance-metrics">
      <div className="metric">
        <Zap className="metric-icon" />
        <span>Translation: {metrics.translationLatency}ms</span>
      </div>
      <div className="metric">
        <Mic className="metric-icon" />
        <span>Speech: {metrics.speechRecognitionLatency}ms</span>
      </div>
      <div className="metric">
        <Hand className="metric-icon" />
        <span>Sign: {metrics.signDetectionLatency}ms</span>
      </div>
      <div className="metric">
        <Signal className="metric-icon" />
        <span>Cache Hit: {metrics.cacheHitRate}%</span>
      </div>
      {offlineMode && (
        <div className="metric offline">
          <WifiOff className="metric-icon" />
          <span>Offline Mode Active</span>
        </div>
      )}
    </div>
  </div>
);

export default PerformancePanel; 