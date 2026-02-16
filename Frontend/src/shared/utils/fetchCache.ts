type CacheEntry = {
  data: any;
  expiry: number;
  fetching?: boolean;
};

const cache = new Map<string, CacheEntry>();

function simpleHash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}

export function makeCacheKey(prefix: string, value: string) {
  return `${prefix}:${simpleHash(value)}`;
}

export async function fetchWithStaleWhileRevalidate(key: string, fetcher: () => Promise<any>, ttl = 1000 * 60 * 5) {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry) {
    // fresh
    if (entry.expiry > now) return entry.data;

    // stale: return stale immediately and revalidate in background
    if (!entry.fetching) {
      entry.fetching = true;
      fetcher()
        .then((data) => {
          cache.set(key, { data, expiry: Date.now() + ttl });
        })
        .catch(() => {
          // keep stale data on error
        })
        .finally(() => {
          const e = cache.get(key);
          if (e) e.fetching = false;
        });
    }
    return entry.data;
  }

  // miss: fetch and cache
  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + ttl });
  return data;
}

export function clearCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
