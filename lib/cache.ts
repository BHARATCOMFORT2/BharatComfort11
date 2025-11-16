// lib/cache.ts
// Simple in-memory cache with TTL support

type CacheItem = {
  value: any;
  expiresAt: number;
};

const cacheStore = new Map<string, CacheItem>();

export function cacheSet(key: string, value: any, ttlSeconds: number = 60) {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function cacheGet(key: string) {
  const item = cacheStore.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return item.value;
}

export function cacheDelete(key: string) {
  cacheStore.delete(key);
}
