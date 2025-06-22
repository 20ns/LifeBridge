// Performance monitoring utility for LifeBridge medical translation
export interface PerformanceMetrics {
  translationLatency: number;
  speechRecognitionLatency: number;
  signDetectionLatency: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  uptime: number;
}

export interface PerformanceThresholds {
  translationLatency: number; // max 2000ms for medical context
  speechRecognitionLatency: number; // max 3000ms for emergency
  signDetectionLatency: number; // max 1000ms for real-time
  apiResponseTime: number; // max 1500ms for critical operations
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private operationStartTimes: Map<string, number>;
  private performanceHistory: PerformanceMetrics[];
  private thresholds: PerformanceThresholds;

  constructor() {
    this.startTime = Date.now();
    this.operationStartTimes = new Map();
    this.performanceHistory = [];
    this.metrics = {
      translationLatency: 0,
      speechRecognitionLatency: 0,
      signDetectionLatency: 0,
      apiResponseTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 85,
      errorRate: 0,
      uptime: 0
    };
    this.thresholds = {
      translationLatency: 2000, // 2 seconds max for medical translations
      speechRecognitionLatency: 3000, // 3 seconds max for emergency speech
      signDetectionLatency: 1000, // 1 second max for real-time sign detection
      apiResponseTime: 1500 // 1.5 seconds max for API calls
    };
  }

  // Start tracking an operation
  startOperation(operationName: string): void {
    this.operationStartTimes.set(operationName, performance.now());
  }

  // End tracking an operation and update metrics
  endOperation(operationName: string): number {
    const startTime = this.operationStartTimes.get(operationName);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.operationStartTimes.delete(operationName);

    // Update relevant metric
    switch (operationName) {
      case 'translation':
        this.metrics.translationLatency = duration;
        break;
      case 'speechRecognition':
        this.metrics.speechRecognitionLatency = duration;
        break;
      case 'signDetection':
        this.metrics.signDetectionLatency = duration;
        break;
      case 'apiCall':
        this.metrics.apiResponseTime = duration;
        break;
      case 'render':
        this.metrics.renderTime = duration;
        break;
    }

    return duration;
  }

  // Update memory usage
  updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit * 100;
    }
  }

  // Update cache hit rate
  updateCacheHitRate(hits: number, misses: number): void {
    const total = hits + misses;
    this.metrics.cacheHitRate = total > 0 ? (hits / total) * 100 : 0;
  }

  // Update error rate
  recordError(): void {
    // Simple error counting - in production you'd want more sophisticated tracking
    this.metrics.errorRate = Math.min(this.metrics.errorRate + 1, 100);
  }

  // Update uptime
  updateUptime(): void {
    this.metrics.uptime = Date.now() - this.startTime;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.updateUptime();
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  // Check if performance meets thresholds
  checkThresholds(): { [key: string]: boolean } {
    return {
      translationLatency: this.metrics.translationLatency <= this.thresholds.translationLatency,
      speechRecognitionLatency: this.metrics.speechRecognitionLatency <= this.thresholds.speechRecognitionLatency,
      signDetectionLatency: this.metrics.signDetectionLatency <= this.thresholds.signDetectionLatency,
      apiResponseTime: this.metrics.apiResponseTime <= this.thresholds.apiResponseTime
    };
  }

  // Get performance health score (0-100)
  getHealthScore(): number {
    const thresholdChecks = this.checkThresholds();
    const passedChecks = Object.values(thresholdChecks).filter(Boolean).length;
    const totalChecks = Object.keys(thresholdChecks).length;
    
    const performanceScore = (passedChecks / totalChecks) * 70; // 70% weight for performance
    const uptimeScore = Math.min((this.metrics.uptime / (24 * 60 * 60 * 1000)) * 30, 30); // 30% weight for uptime
    
    return Math.round(performanceScore + uptimeScore);
  }

  // Get performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const thresholds = this.checkThresholds();

    if (!thresholds.translationLatency) {
      recommendations.push('Translation latency is high - consider implementing caching or using a faster model');
    }
    
    if (!thresholds.speechRecognitionLatency) {
      recommendations.push('Speech recognition is slow - check microphone quality and internet connection');
    }
    
    if (!thresholds.signDetectionLatency) {
      recommendations.push('Sign detection latency is high - optimize camera settings or model performance');
    }
    
    if (!thresholds.apiResponseTime) {
      recommendations.push('API response time is slow - check network connectivity and server performance');
    }

    if (this.metrics.memoryUsage > 80) {
      recommendations.push('High memory usage detected - consider clearing cache or optimizing components');
    }

    if (this.metrics.cacheHitRate < 70) {
      recommendations.push('Low cache hit rate - review caching strategy for frequently used translations');
    }

    if (this.metrics.errorRate > 10) {
      recommendations.push('High error rate detected - review error handling and API stability');
    }

    return recommendations;
  }

  // Record metrics snapshot for history
  recordSnapshot(): void {
    this.performanceHistory.push({ ...this.getMetrics() });
    
    // Keep only last 100 snapshots
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  // Get performance history
  getHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  // Export performance report
  exportReport(): string {
    const metrics = this.getMetrics();
    const health = this.getHealthScore();
    const recommendations = this.getRecommendations();

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      healthScore: health,
      metrics,
      recommendations,
      thresholds: this.thresholds
    }, null, 2);
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startOperation: performanceMonitor.startOperation.bind(performanceMonitor),
    endOperation: performanceMonitor.endOperation.bind(performanceMonitor),
    recordError: performanceMonitor.recordError.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getHealthScore: performanceMonitor.getHealthScore.bind(performanceMonitor),
    getRecommendations: performanceMonitor.getRecommendations.bind(performanceMonitor),
    recordSnapshot: performanceMonitor.recordSnapshot.bind(performanceMonitor),
    exportReport: performanceMonitor.exportReport.bind(performanceMonitor)
  };
};
