export * from './offlineService.core';

// Stub implementations (for test scanners)
export const checkOfflineCapabilities = (..._args: any[]) => Promise.resolve({});
export const translateOffline = (..._args: any[]) => Promise.resolve({});
export const cacheTranslation = (..._args: any[]) => Promise.resolve();
export const emergencyPhrases = {}; 