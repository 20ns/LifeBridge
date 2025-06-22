// Centralised front-end configuration

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://sevmuborah.execute-api.eu-north-1.amazonaws.com/prod';

export const AWS_REGION = process.env.REACT_APP_AWS_REGION || 'eu-north-1';

// Cache TTL (ms) for browser translation cache
export const TRANSLATION_CACHE_TTL = process.env.REACT_APP_TRANSLATION_CACHE_TTL ? Number(process.env.REACT_APP_TRANSLATION_CACHE_TTL) : 300_000; 