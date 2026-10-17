// lib/rate-limit.ts
// Simple in-memory fixed-window rate limiter, keyed by an arbitrary string
// (e.g. `agent-chat:${userId}`).
//
// NOTE: state lives in this server instance's memory only. On Vercel each
// serverless instance has its own counter and it resets on cold start, so
// this is a best-effort guard against runaway clients, not a hard global
// limit. Swap for a shared store (e.g. Upstash Redis) if that ever matters.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;

  // Opportunistic cleanup so the map doesn't grow forever on a long-lived dev server.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
