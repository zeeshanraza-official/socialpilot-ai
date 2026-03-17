import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production via upstash or similar)
const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  max: number;         // max requests
  windowMs: number;   // time window in ms
  keyPrefix?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function rateLimit(config: RateLimitConfig) {
  const { max, windowMs, keyPrefix = "rl" } = config;

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const fullKey = `${keyPrefix}:${key}`;
    const entry = store.get(fullKey);

    if (!entry || now > entry.resetAt) {
      // New window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(fullKey, newEntry);

      // Cleanup old entries periodically
      if (Math.random() < 0.01) {
        cleanupStore();
      }

      return {
        success: true,
        remaining: max - 1,
        resetAt: newEntry.resetAt,
      };
    }

    if (entry.count >= max) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    entry.count++;
    store.set(fullKey, entry);

    return {
      success: true,
      remaining: max - entry.count,
      resetAt: entry.resetAt,
    };
  };
}

function cleanupStore() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// Pre-configured limiters
export const apiLimiter = rateLimit({
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  keyPrefix: "api",
});

export const authLimiter = rateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "auth",
});

export const aiLimiter = rateLimit({
  max: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "ai",
});

export const uploadLimiter = rateLimit({
  max: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "upload",
});

// Platform-specific rate limiters (per social account)
export const platformLimiters: Record<string, ReturnType<typeof rateLimit>> = {
  facebook: rateLimit({ max: 200, windowMs: 60 * 60 * 1000, keyPrefix: "fb" }),
  instagram: rateLimit({ max: 100, windowMs: 60 * 60 * 1000, keyPrefix: "ig" }),
  linkedin: rateLimit({ max: 100, windowMs: 24 * 60 * 60 * 1000, keyPrefix: "li" }),
  youtube: rateLimit({ max: 50, windowMs: 24 * 60 * 60 * 1000, keyPrefix: "yt" }),
};

/**
 * Get client IP from request (with proxy support)
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
