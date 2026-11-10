// Sliding-window limiter keyed by client IP.
// ponytail: in-memory, so each serverless instance counts separately and a
// cold start resets it. Good enough to stop casual abuse of a demo; move to
// Upstash Redis (@upstash/ratelimit) if the key's spend ever matters.
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}) {
  const hits = new Map<string, number[]>();

  return (key: string): { ok: true } | { ok: false; retryAfterSec: number } => {
    const t = now();
    if (hits.size > 10_000) hits.clear(); // bound memory on IP floods
    const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfterSec: Math.ceil((recent[0] + windowMs - t) / 1000) };
    }
    recent.push(t);
    hits.set(key, recent);
    return { ok: true };
  };
}
