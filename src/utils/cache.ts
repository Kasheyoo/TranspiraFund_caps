interface CacheEntry<T> {
  data: T;
  ts: number;
}

const _cache: Record<string, CacheEntry<unknown>> = {};

export function getCached<T>(key: string, ttlMs = 5 * 60 * 1000): T | null {
  const entry = _cache[key] as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    delete _cache[key];
    return null;
  }
  return entry.data;
}

export function setCached<T>(key: string, data: T): void {
  _cache[key] = { data, ts: Date.now() };
}

export function invalidateCache(key: string): void {
  delete _cache[key];
}
