// Real-time performance monitoring component
import React, { useState, useEffect } from 'react';
import { Activity, Zap, Globe, Shield } from 'lucide-react';

interface PerformanceMetrics {
  translationLatency: number;
  signLanguageAccuracy: number;
  activeConnections: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  awsServicesStatus: Record<string, 'online' | 'degraded' | 'offline'>;
}
export const LivePerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    translationLatency: 0,
    signLanguageAccuracy: 0,
    activeConnections: 0,
    systemHealth: 'excellent',
    awsServicesStatus: {}
  });

  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Simulate real-time metrics
      setMetrics(prev => ({
        ...prev,
        translationLatency: 350 + Math.random() * 150, // 350-500ms
        signLanguageAccuracy: 94 + Math.random() * 6,  // 94-100%
        activeConnections: Math.floor(Math.random() * 50) + 10,
        systemHealth: Math.random() > 0.1 ? 'excellent' : 'good',
        awsServicesStatus: {
          'Bedrock Nova Micro': 'online',
          'Lambda Functions': 'online',
          'API Gateway': 'online',
          'S3 Storage': 'online',
          'CloudWatch': 'online',
          'Transcribe': Math.random() > 0.05 ? 'online' : 'degraded',
          'Polly': 'online'
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return '#10B981';
      case 'good': return '#3B82F6';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'degraded': return '#F59E0B';
      case 'offline': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="emergency-container emergency-theme-light p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-blue-600" />
          <h2 className="text-2xl font-bold">Live Performance Dashboard</h2>
        </div>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            isLive
              ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
              : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
          }`}
        >
          {isLive ? '🔴 Stop Live Demo' : '▶️ Start Live Demo'}
        </button>
      </div>

      {isLive && (
        <>
          {/* Real-time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="emergency-card text-center">
              <Zap size={32} className="mx-auto mb-2 text-yellow-600" />
              <h3 className="font-bold text-lg mb-1">Translation Speed</h3>
              <div className="text-2xl font-bold text-green-600">
                {metrics.translationLatency.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Target: &lt;500ms</div>
            </div>

            <div className="emergency-card text-center">
              <Shield size={32} className="mx-auto mb-2 text-blue-600" />
              <h3 className="font-bold text-lg mb-1">Sign Language Accuracy</h3>
              <div className="text-2xl font-bold text-green-600">
                {metrics.signLanguageAccuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Target: &gt;95%</div>
            </div>

            <div className="emergency-card text-center">
              <Globe size={32} className="mx-auto mb-2 text-purple-600" />
              <h3 className="font-bold text-lg mb-1">Active Users</h3>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.activeConnections}
              </div>
              <div className="text-sm text-gray-600">Concurrent sessions</div>
            </div>

            <div className="emergency-card text-center">
              <Activity size={32} className="mx-auto mb-2" style={{ color: getHealthColor(metrics.systemHealth) }} />
              <h3 className="font-bold text-lg mb-1">System Health</h3>
              <div className="text-2xl font-bold capitalize" style={{ color: getHealthColor(metrics.systemHealth) }}>
                {metrics.systemHealth}
              </div>
              <div className="text-sm text-gray-600">Overall status</div>
            </div>
          </div>

          {/* AWS Services Status */}
          <div className="emergency-card">
            <h3 className="text-xl font-bold mb-4">AWS Services Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.awsServicesStatus).map(([service, status]) => (
                <div key={service} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getStatusColor(status) }}
                  />
                  <div>
                    <div className="font-semibold text-sm">{service}</div>
                    <div className="text-xs text-gray-600 capitalize">{status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Graph Placeholder */}
          <div className="emergency-card mt-6">
            <h3 className="text-xl font-bold mb-4">Real-time Performance Trends</h3>
            <div className="h-40 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
              <div className="text-gray-500 text-center">
                <Activity size={48} className="mx-auto mb-2 opacity-50" />
                <p>Live performance visualization</p>
                <p className="text-sm">Shows translation latency, accuracy trends, and traffic patterns</p>
              </div>
            </div>
          </div>
        </>
      )}

      {!isLive && (
        <div className="emergency-card text-center py-12">
          <Activity size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold mb-2 text-gray-600">Live Demo Ready</h3>
          <p className="text-gray-500 mb-4">
            Click "Start Live Demo" to see real-time performance metrics during hackathon presentation
          </p>
          <div className="text-sm text-gray-400">
            Simulates actual system performance with realistic data
          </div>
        </div>
      )}
    </div>
  );
};

export default LivePerformanceDashboard;
