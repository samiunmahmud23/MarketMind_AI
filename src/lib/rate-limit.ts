import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter (token bucket algorithm).
 *
 * No external dependencies — works with the free-tier stack.
 * Rate limits are per-IP and reset automatically.
 *
 * Usage:
 *   const limiter = getRateLimiter("ai", 5, 60); // 5 requests per 60s
 *   const result = limiter.check(req);
 *   if (!result.allowed) return RateLimitedResponse(result);
 */

interface RateLimitConfig {
  // Max requests in the window
  max: number;
  // Window in seconds
  windowSec: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

// Rate limit presets by route type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  read: { max: 100, windowSec: 60 },    // GET routes: 100/min
  write: { max: 30, windowSec: 60 },    // POST/PUT/DELETE: 30/min
  ai: { max: 10, windowSec: 60 },       // AI-heavy routes (generate, analyze): 10/min
  send: { max: 5, windowSec: 300 },     // Email sending: 5 per 5 min
  auth: { max: 10, windowSec: 60 },     // Auth routes: 10/min
  search: { max: 20, windowSec: 60 },   // Search: 20/min
};

// In-memory store: Map<ip:routeType, BucketEntry>
const store = new Map<string, BucketEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a request.
 */
export function checkRateLimit(
  req: NextRequest,
  type: keyof typeof RATE_LIMITS = "read"
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const ip = getClientIP(req);
  const key = `${ip}:${type}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowSec * 1000 };
    store.set(key, entry);
  }

  entry.count++;

  const allowed = entry.count <= config.max;
  const remaining = Math.max(0, config.max - entry.count);

  return {
    allowed,
    limit: config.max,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Create a 429 Too Many Requests response with rate limit headers.
 */
export function RateLimitedResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      message: `Too many requests. Try again in ${retryAfter} seconds.`,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * Middleware-style rate limit check.
 * Returns null if allowed, or a NextResponse (429) if rate-limited.
 */
export function rateLimit(
  req: NextRequest,
  type: keyof typeof RATE_LIMITS = "read"
): NextResponse | null {
  const result = checkRateLimit(req, type);
  if (!result.allowed) {
    return RateLimitedResponse(result);
  }
  return null;
}
