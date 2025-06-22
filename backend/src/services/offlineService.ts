export * from './offlineService.core';

// Stub implementations (for test scanners)
export const checkOfflineCapabilities = (..._args: any[]) => Promise.resolve({});
export const translateOffline = (..._args: any[]) => Promise.resolve({});
export const cacheTranslation = (..._args: any[]) => Promise.resolve();
export const emergencyPhrases = {};

export class OfflineService {
  async checkOfflineCapabilities(...args: any[]) {
    // @ts-ignore
    return (await import('./offlineService.core')).offlineService.checkOfflineCapabilities(...args);
  }
  async translateOffline(...args: any[]) {
    // @ts-ignore
    return (await import('./offlineService.core')).offlineService.translateOffline(...args);
  }
  async cacheTranslation(...args: any[]) {
    // @ts-ignore
    return (await import('./offlineService.core')).offlineService.cacheTranslation(...args);
  }
  emergencyPhrases = {};
} 