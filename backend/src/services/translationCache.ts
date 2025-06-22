import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.TRANSLATE_CACHE_TABLE;
const TTL_DAYS = 7;
const SECONDS_IN_DAY = 86400;

// Fallback in-memory cache for local dev & tests
const memoryCache = new Map<string, { text: string; confidence: number; expire: number }>();

const dynamoDbClient = TABLE_NAME ? new DynamoDBClient({}) : undefined;

const getCacheKey = (text: string, src: string, tgt: string) =>
  `${src}:${tgt}:${text}`.substring(0, 1024);

export const getCachedTranslation = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ translatedText: string; confidence: number } | null> => {
  const key = getCacheKey(text, sourceLanguage, targetLanguage);
  const now = Math.floor(Date.now() / 1000);

  // Memory cache first
  const mem = memoryCache.get(key);
  if (mem && mem.expire > now) {
    return { translatedText: mem.text, confidence: mem.confidence };
  }

  if (!dynamoDbClient || !TABLE_NAME) return null;

  try {
    const res = await dynamoDbClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: key } },
        ConsistentRead: false,
      })
    );

    const item = res.Item;
    if (item && item.translatedText && item.confidence) {
      const translatedText = item.translatedText.S || '';
      const confidence = parseFloat(item.confidence.N || '0.9');
      const ttl = parseInt(item.ttl?.N || '0', 10);
      if (ttl > now) {
        // populate memory cache
        memoryCache.set(key, { text: translatedText, confidence, expire: ttl });
        return { translatedText, confidence };
      }
    }
  } catch (err) {
    console.warn('Translate cache get error', err);
  }
  return null;
};

export const putCachedTranslation = async (
  text: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
  confidence = 0.9
): Promise<void> => {
  const key = getCacheKey(text, sourceLanguage, targetLanguage);
  const ttl = Math.floor(Date.now() / 1000) + TTL_DAYS * SECONDS_IN_DAY;

  // store in memory
  memoryCache.set(key, { text: translatedText, confidence, expire: ttl });

  if (!dynamoDbClient || !TABLE_NAME) return;

  try {
    await dynamoDbClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          id: { S: key },
          translatedText: { S: translatedText },
          confidence: { N: confidence.toString() },
          sourceLanguage: { S: sourceLanguage },
          targetLanguage: { S: targetLanguage },
          ttl: { N: ttl.toString() },
        },
      })
    );
  } catch (err) {
    console.warn('Translate cache put error', err);
  }
}; 