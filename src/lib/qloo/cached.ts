import { cacheKey, type Cache } from "@/lib/cache/cache";
import type { QlooClient } from "./types";

/** Qloo answers change slowly; a day keeps demo runs fast without going stale. */
export const QLOO_CACHE_TTL = 24 * 60 * 60;

/**
 * Wrap a Qloo client so identical requests are served from the server-side cache. Identical
 * requests already in flight share one call: parallel references ask for the same control-city
 * lists at the same moment, before the first answer is cached. Errors are never cached.
 */
/** Counts for one wrapper: answers served without going to Qloo, and requests that did. */
export interface CacheStats {
  hits: number;
  requests: number;
}

export function withCache(client: QlooClient, cache: Cache, ttl = QLOO_CACHE_TTL, stats?: CacheStats): QlooClient {
  const inFlight = new Map<string, Promise<unknown>>();
  const cached =
    <I, O>(name: string, fn: (input: I) => Promise<O>) =>
    async (input: I): Promise<O> => {
      const key = cacheKey(`qloo:${name}`, input);
      const pending = inFlight.get(key);
      if (pending) {
        if (stats) stats.hits++;
        return pending as Promise<O>;
      }
      const work = (async () => {
        const hit = await cache.get<O>(key);
        if (hit) {
          if (stats) stats.hits++;
          return hit;
        }
        if (stats) stats.requests++;
        const result = await fn(input);
        await cache.set(key, result, ttl);
        return result;
      })();
      inFlight.set(key, work);
      try {
        return await work;
      } finally {
        inFlight.delete(key);
      }
    };
  return {
    searchEntities: cached("search", (i) => client.searchEntities(i)),
    getEntities: cached("entities", (i) => client.getEntities(i)),
    getDemographics: cached("demographics", (i) => client.getDemographics(i)),
    searchTags: cached("tags", (i) => client.searchTags(i)),
    getInsights: cached("insights", (i) => client.getInsights(i)),
    compareProfiles: cached("compare", (i) => client.compareProfiles(i)),
  };
}
