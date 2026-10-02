import { NextResponse } from "next/server";

export type RateLimitTier = "AUTH" | "EXPENSIVE" | "API";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  AUTH: {
    maxRequests: 25,
    windowMs: 15 * 60 * 1000, // 25 requests per 15 minutes
  },
  EXPENSIVE: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requests per minute
  },
  API: {
    maxRequests: 120,
    windowMs: 60 * 1000, // 120 requests per minute
  },
};

interface RateLimitRecord {
  timestamps: number[];
}

const storage = new Map<string, RateLimitRecord>();

// Periodic garbage collection every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of storage.entries()) {
    // Keep timestamps newer than the longest window (15 minutes)
    record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (record.timestamps.length === 0) {
      storage.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}

export function checkRateLimit(identifier: string, tier: RateLimitTier = "API") {
  const config = TIER_CONFIGS[tier];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const key = `${tier}:${identifier}`;
  let record = storage.get(key);

  if (!record) {
    record = { timestamps: [] };
    storage.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= config.maxRequests) {
    const oldest = record.timestamps[0];
    const resetTime = Math.ceil((oldest + config.windowMs - now) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds: Math.max(1, resetTime),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.timestamps.length,
    resetSeconds: Math.ceil(config.windowMs / 1000),
  };
}

/**
 * Convenience helper for API route handlers. Returns a 429 NextResponse if rate limit exceeded, or null if allowed.
 */
export function enforceRateLimit(req: Request, tier: RateLimitTier = "API", customIdentifier?: string): NextResponse | null {
  const id = customIdentifier || getClientIp(req);
  const result = checkRateLimit(id, tier);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down.",
        retryAfter: result.resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.resetSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
