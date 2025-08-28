// lib/cache.js
import { LRUCache } from 'lru-cache';

// 30s TTL LRU cache for hot /posts queries
export const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 30, // ms
});

// Build a stable cache key (order-independent)
export const keyFromReq = (req) => {
  const q = req?.query || {};
  const parts = Object.keys(q)
    .sort()
    .map((k) => `${k}:${Array.isArray(q[k]) ? q[k].join(',') : q[k]}`);
  return `posts:${parts.join('|')}`;
};

export const clearPostsCache = () => {
  for (const k of cache.keys()) {
    if (String(k).startsWith('posts:')) cache.delete(k);
  }
};
