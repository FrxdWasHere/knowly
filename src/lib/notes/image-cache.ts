/**
 * Image cache management with LRU eviction and size limits.
 * Prevents memory leaks from unchecked image caching.
 */

interface CacheEntry {
  data: string;
  size: number;
  timestamp: number;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_ITEMS = 200;

let cache = new Map<string, CacheEntry>();
let totalSize = 0;
let maxSize = DEFAULT_MAX_SIZE;
let maxItems = DEFAULT_MAX_ITEMS;

/**
 * Set cache size limits.
 */
export function setCacheLimits(newMaxSize: number, newMaxItems: number): void {
  maxSize = newMaxSize;
  maxItems = newMaxItems;
  evictIfNeeded();
}

/**
 * Get an image from cache.
 */
export function getCachedImage(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Update timestamp for LRU
  entry.timestamp = Date.now();
  return entry.data;
}

/**
 * Store an image in cache with size tracking.
 */
export function cacheImage(key: string, data: string): void {
  // Remove old entry if it exists
  if (cache.has(key)) {
    const old = cache.get(key)!;
    totalSize -= old.size;
  }

  const size = new Blob([data]).size;
  cache.set(key, {
    data,
    size,
    timestamp: Date.now(),
  });
  totalSize += size;

  evictIfNeeded();
}

/**
 * Remove evict cache entries if size or item limits are exceeded.
 * Uses LRU (Least Recently Used) eviction policy.
 */
function evictIfNeeded(): void {
  // Evict by item count
  while (cache.size > maxItems) {
    const oldest = findOldestEntry();
    if (oldest) {
      removeEntry(oldest);
    }
  }

  // Evict by total size
  while (totalSize > maxSize && cache.size > 1) {
    const oldest = findOldestEntry();
    if (oldest) {
      removeEntry(oldest);
    }
  }
}

/**
 * Find the least recently used entry.
 */
function findOldestEntry(): string | null {
  let oldest: { key: string; timestamp: number } | null = null;
  for (const [key, entry] of cache) {
    if (!oldest || entry.timestamp < oldest.timestamp) {
      oldest = { key, timestamp: entry.timestamp };
    }
  }
  return oldest?.key ?? null;
}

/**
 * Remove an entry from cache.
 */
function removeEntry(key: string): void {
  const entry = cache.get(key);
  if (entry) {
    totalSize -= entry.size;
    cache.delete(key);
  }
}

/**
 * Clear the entire cache.
 */
export function clearImageCache(): void {
  cache.clear();
  totalSize = 0;
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  items: number;
  totalSize: number;
  maxSize: number;
  maxItems: number;
  utilization: number;
} {
  return {
    items: cache.size,
    totalSize,
    maxSize,
    maxItems,
    utilization: maxSize > 0 ? totalSize / maxSize : 0,
  };
}

/**
 * Preemptively evict if utilization exceeds threshold.
 * Call this before caching large images.
 */
export function preEvict(threshold = 0.8): void {
  if (totalSize / maxSize >= threshold) {
    // Evict oldest 10% of items
    const countToEvict = Math.max(1, Math.floor(cache.size * 0.1));
    for (let i = 0; i < countToEvict; i++) {
      const oldest = findOldestEntry();
      if (oldest) {
        removeEntry(oldest);
      }
    }
  }
}
