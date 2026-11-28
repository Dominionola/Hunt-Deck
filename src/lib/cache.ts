import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";

interface MemoryEntry {
  expiresAt: number;
  value: unknown;
}

const MAX_MEMORY_ENTRIES = 250;
const globalForCache = globalThis as unknown as {
  huntDeckMemoryCache?: Map<string, MemoryEntry>;
  huntDeckInFlight?: Map<string, Promise<unknown>>;
};

const memoryCache = globalForCache.huntDeckMemoryCache ?? new Map<string, MemoryEntry>();
const inFlightRequests = globalForCache.huntDeckInFlight ?? new Map<string, Promise<unknown>>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.huntDeckMemoryCache = memoryCache;
  globalForCache.huntDeckInFlight = inFlightRequests;
}

function buildCacheKey(namespace: string, keyParts: unknown): string {
  const serialized = JSON.stringify(keyParts) ?? "";
  const digest = createHash("sha256").update(serialized).digest("hex").slice(0, 32);
  return `huntdeck:cache:${namespace}:${digest}`;
}

function setMemoryEntry(key: string, value: unknown, ttlSeconds: number) {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value,
  });
}

function getMemoryEntry<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function clearMemoryCache() {
  memoryCache.clear();
}

/**
 * Reads from Redis (with bounded in-memory fallback) and coalesces concurrent
 * in-flight cache misses so external upstream APIs are never hit redundantly.
 */
export async function getOrSetCached<T>(
  namespace: string,
  keyParts: unknown,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const cacheKey = buildCacheKey(namespace, keyParts);

  // 1. Try Redis when ready
  if (redis.status === "ready") {
    try {
      const raw = await redis.get(cacheKey);
      if (raw) {
        return { data: JSON.parse(raw) as T, cached: true };
      }
    } catch {
      // Fall through to memory cache / loader
    }
  }

  // 2. Try bounded in-memory fallback
  const memHit = getMemoryEntry<T>(cacheKey);
  if (memHit !== null) {
    return { data: memHit, cached: true };
  }

  // 3. Coalesce identical concurrent misses
  const existingFlight = inFlightRequests.get(cacheKey) as Promise<T> | undefined;
  if (existingFlight) {
    const data = await existingFlight;
    return { data, cached: true };
  }

  const flight = loader()
    .then(async (fresh) => {
      setMemoryEntry(cacheKey, fresh, ttlSeconds);
      if (redis.status === "ready") {
        try {
          await redis.set(cacheKey, JSON.stringify(fresh), "EX", ttlSeconds);
        } catch {
          // Non-fatal: memory cache already holds the entry
        }
      }
      return fresh;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, flight);
  const data = await flight;
  return { data, cached: false };
}
