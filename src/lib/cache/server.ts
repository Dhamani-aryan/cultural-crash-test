import "server-only";
import { getRedisEnv } from "@/lib/env";
import { createMemoryCache, createRedisCache, type Cache } from "./cache";

let cache: Cache | null = null;

/** Upstash Redis when configured (shared across serverless instances); in-memory otherwise. */
export function getCache(): Cache {
  if (cache) return cache;
  try {
    cache = createRedisCache(getRedisEnv());
  } catch {
    cache = createMemoryCache();
  }
  return cache;
}
