// Simple persistent translation cache using localStorage
// Key format: lifebridge-cache:{source}:{target}:{text}
// Metadata stored in a manifest for LRU eviction

const MANIFEST_KEY = 'lifebridge-cache-manifest';
const MAX_ENTRIES = 500;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface ManifestEntry {
  key: string;
  timestamp: number; // last access
}

const loadManifest = (): ManifestEntry[] => {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    return raw ? (JSON.parse(raw) as ManifestEntry[]) : [];
  } catch {
    return [];
  }
};

const saveManifest = (manifest: ManifestEntry[]) => {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  } catch {}
};

const buildKey = (text: string, source: string, target: string) =>
  `lifebridge-cache:${source}:${target}:${text}`.slice(0, 1024);

export const getCachedTranslation = (
  text: string,
  source: string,
  target: string
): { translatedText: string; confidence: number } | null => {
  try {
    const key = buildKey(text, source, target);
    const itemRaw = localStorage.getItem(key);
    if (!itemRaw) return null;

    const item = JSON.parse(itemRaw) as {
      translatedText: string;
      confidence: number;
      expire: number;
    };
    if (Date.now() > item.expire) {
      localStorage.removeItem(key);
      return null;
    }

    // Update manifest timestamp (LRU)
    const manifest = loadManifest();
    const idx = manifest.findIndex((m) => m.key === key);
    if (idx >= 0) manifest[idx].timestamp = Date.now();
    else manifest.push({ key, timestamp: Date.now() });
    saveManifest(manifest);

    return { translatedText: item.translatedText, confidence: item.confidence };
  } catch {
    return null;
  }
};

export const putCachedTranslation = (
  text: string,
  translatedText: string,
  source: string,
  target: string,
  confidence = 0.9
) => {
  try {
    const key = buildKey(text, source, target);
    const expire = Date.now() + TTL_MS;
    localStorage.setItem(
      key,
      JSON.stringify({ translatedText, confidence, expire })
    );

    // Update manifest
    let manifest = loadManifest();
    const existingIdx = manifest.findIndex((m) => m.key === key);
    if (existingIdx >= 0) manifest.splice(existingIdx, 1);
    manifest.push({ key, timestamp: Date.now() });

    // Evict if over capacity
    if (manifest.length > MAX_ENTRIES) {
      manifest.sort((a, b) => a.timestamp - b.timestamp); // oldest first
      const toRemove = manifest.splice(0, manifest.length - MAX_ENTRIES);
      toRemove.forEach((m) => localStorage.removeItem(m.key));
    }
    saveManifest(manifest);
  } catch {
    // Ignore quota errors
  }
}; 