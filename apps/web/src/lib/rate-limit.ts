/**
 * Simple in-memory rate limiter using a leaky bucket algorithm
 * In production, use Redis or similar for distributed rate limiting
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  capacity: number; // Maximum tokens
  refillRate: number; // Tokens per second
  cost?: number; // Cost per request (default: 1)
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Timestamp when bucket will be full
  retryAfter?: number; // Seconds to wait if rate limited
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const { capacity, refillRate, cost = 1 } = config;

  let entry = store.get(key);

  if (!entry) {
    entry = { tokens: capacity, lastRefill: now };
    store.set(key, entry);
  }

  // Calculate tokens to add based on time elapsed
  const elapsed = (now - entry.lastRefill) / 1000; // seconds
  const tokensToAdd = elapsed * refillRate;
  entry.tokens = Math.min(capacity, entry.tokens + tokensToAdd);
  entry.lastRefill = now;

  // Check if we have enough tokens
  if (entry.tokens >= cost) {
    entry.tokens -= cost;
    const reset = now + ((capacity - entry.tokens) / refillRate) * 1000;

    return {
      success: true,
      remaining: Math.floor(entry.tokens),
      reset: Math.floor(reset),
    };
  }

  // Not enough tokens
  const tokensNeeded = cost - entry.tokens;
  const retryAfter = Math.ceil(tokensNeeded / refillRate);
  const reset = now + ((capacity - entry.tokens) / refillRate) * 1000;

  return {
    success: false,
    remaining: 0,
    reset: Math.floor(reset),
    retryAfter,
  };
}

// Global rate limit for all requests
export function globalRateLimit(ip: string): RateLimitResult {
  return rateLimit(`global:${ip}`, {
    capacity: 100,
    refillRate: 10, // 10 requests per second
  });
}

// Per-API-key rate limit
export function apiKeyRateLimit(apiKey: string): RateLimitResult {
  return rateLimit(`api_key:${apiKey}`, {
    capacity: 1000,
    refillRate: 100, // 100 requests per second
  });
}

// Cleanup old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, entry] of store.entries()) {
      if (now - entry.lastRefill > maxAge && entry.tokens >= store.get(key)?.tokens!) {
        store.delete(key);
      }
    }
  }, 300000); // Run every 5 minutes
}
