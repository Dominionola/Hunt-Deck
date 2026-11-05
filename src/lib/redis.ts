import Redis from "ioredis";

/**
 * Redis Client Singleton for Next.js
 * Handles caching, rate limiting, and BullMQ background workers with graceful degradation.
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true, // Don't crash immediately if Redis is unreachable on local boot
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying after 3 attempts in development to prevent terminal spam
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

redis.on("error", (err) => {
  // Silent warning in dev to allow app execution even if local Redis is offline
  if (process.env.NODE_ENV === "development") {
    console.warn("[Redis] Optional local cache offline:", err.message);
  } else {
    console.error("[Redis] Connection error:", err);
  }
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
