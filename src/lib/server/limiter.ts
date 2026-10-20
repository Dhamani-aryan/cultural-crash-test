import "server-only";
import { getRedisEnv } from "@/lib/env";
import { createMemoryLimiter, createRedisLimiter, type RateLimiter } from "./rate-limit";

let limiter: RateLimiter | null = null;

export function getLimiter(): RateLimiter {
  if (limiter) return limiter;
  try {
    limiter = createRedisLimiter(getRedisEnv());
  } catch {
    limiter = createMemoryLimiter();
  }
  return limiter;
}
