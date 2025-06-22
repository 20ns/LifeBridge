export interface OfflineEvent {
  type: 'sign' | 'translation' | 'system';
  data: any;
  timestamp: number;
}

const KEY = 'lifebridge_offline_events';

const safeParse = (value: string | null): OfflineEvent[] => {
  try {
    return value ? (JSON.parse(value) as OfflineEvent[]) : [];
  } catch {
    return [];
  }
};

const loadQueue = (): OfflineEvent[] => safeParse(localStorage.getItem(KEY));

const saveQueue = (queue: OfflineEvent[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* ignore quota / unsupported */
  }
};

export const enqueueOfflineEvent = (event: OfflineEvent) => {
  const queue = loadQueue();
  queue.push(event);
  saveQueue(queue);
};

export const flushOfflineEvents = async () => {
  if (!navigator.onLine) return;
  const queue = loadQueue();
  if (queue.length === 0) return;

  try {
    const res = await fetch('/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: queue }),
    });

    if (res.ok) {
      console.log(`[OfflineQueue] Flushed ${queue.length} events`);
      saveQueue([]);
    } else {
      console.warn('[OfflineQueue] Flush failed:', await res.text());
    }
  } catch (err) {
    console.error('[OfflineQueue] Flush error:', err);
  }
}; 