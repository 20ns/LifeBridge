export const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';

// Default to Nova Micro but allow override
export const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'arn:aws:bedrock:eu-north-1:272942077493:inference-profile/eu.amazon.nova-micro-v1:0';

// Cache TTL for translations (in ms)
export const TRANSLATE_CACHE_TTL = process.env.TRANSLATE_CACHE_TTL ? Number(process.env.TRANSLATE_CACHE_TTL) : 300_000; 