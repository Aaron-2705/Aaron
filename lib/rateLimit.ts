/**
 * Two-tier sliding-window rate limiter.
 *
 * Pure apart from the map it owns: the clock is passed in, so every window
 * boundary is exercised in `tests/logic.spec.ts` without waiting an hour or
 * launching a browser.
 *
 * Why two tiers. The per-key bucket keys off X-Forwarded-For, which is only
 * honest when a trusted proxy overwrites it. A directly-exposed origin lets a
 * caller rotate that header and reset their own bucket at will, which was
 * confirmed against the running endpoint before this existed. The global
 * bucket is the backstop: there is no header a caller can forge to escape it.
 */

export interface RateLimiterOptions {
  /** Max requests per key per window. Omit for no per-key ceiling. */
  perKey?: number;
  /** Max requests across all keys per window. Omit for no global ceiling. */
  global?: number;
  windowMs: number;
  /** Keys retained before stale buckets are swept. */
  maxKeys?: number;
}

export type LimitReason = "ok" | "per-key" | "global";

export interface RateLimiter {
  /**
   * Record an attempt. Returns "ok" when it is allowed, or which tier rejected
   * it. A rejected attempt is NOT recorded, so a blocked caller cannot push
   * their own window forward by hammering.
   */
  check(key: string, now: number): LimitReason;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const {
    perKey = Number.POSITIVE_INFINITY,
    global = Number.POSITIVE_INFINITY,
    windowMs,
    maxKeys = 10_000,
  } = options;
  const buckets = new Map<string, number[]>();
  let globalBucket: number[] = [];

  const prune = (timestamps: readonly number[], windowStart: number) =>
    timestamps.filter((t) => t > windowStart);

  return {
    check(key, now) {
      const windowStart = now - windowMs;

      globalBucket = prune(globalBucket, windowStart);
      if (globalBucket.length >= global) return "global";

      const bucket = prune(buckets.get(key) ?? [], windowStart);
      if (bucket.length >= perKey) {
        // Persist the pruned bucket so the window can still roll forward.
        buckets.set(key, bucket);
        return "per-key";
      }

      bucket.push(now);
      buckets.set(key, bucket);
      globalBucket.push(now);

      // Opportunistic sweep so a rotating-key caller cannot grow the map
      // without bound.
      if (buckets.size > maxKeys) {
        for (const [k, v] of buckets) {
          if (v.every((t) => t <= windowStart)) buckets.delete(k);
        }
      }
      return "ok";
    },
  };
}
