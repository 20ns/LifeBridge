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
  async getEmergencyPhrases(...args: any[]) {
    // @ts-ignore
    return (await import('./offlineService.core')).offlineService.getEmergencyPhrases(...args);
  }
  async getCachedTranslation(...args: any[]) {
    // @ts-ignore
    return (await import('./offlineService.core')).offlineService.getCachedTranslation(...args);
  }
  async checkConnectivity(...args: any[]) {
    // @ts-ignore
    return (await import('./offlineService.core')).offlineService.checkConnectivity(...args);
  }
  emergencyPhrases = {};
}

export const getEmergencyPhrases = (...args: any[]) =>
  import('./offlineService.core').then((m: any) => m.getEmergencyPhrases(...args));

export const getCachedTranslation = (...args: any[]) =>
  import('./offlineService.core').then((m: any) => m.getCachedTranslation(...args));

export const checkConnectivity = (...args: any[]) =>
  import('./offlineService.core').then((m: any) => m.checkConnectivity(...args)); 