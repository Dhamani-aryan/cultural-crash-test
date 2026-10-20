/**
 * Measures how much city-specific taste data Qloo has, per city and domain, and writes the
 * summary to data/coverage.json. Only counts and ratios are written (no Qloo entities), so
 * the file can be committed. Run: npm run live scripts/measure-coverage.ts
 *
 * For each city and domain we take the top 150 results under a location-only signal.
 * - depth: how many results came back (more = more data).
 * - distinct: share of the city's top 50 that appear in at most one other city's top 50.
 *   High means Qloo knows a culture specific to the city; low means generic global content.
 * For places, distinct is meaningless (places are local by definition), so we use category
 * depth: how many places Qloo has in categories references usually point at.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { getQlooEnv } from "../src/lib/env";
import { createQlooClient } from "../src/lib/qloo";

const CITIES = [
  "New York City",
  "London",
  "Paris",
  "Tokyo",
  "Seoul",
  "Mumbai",
  "Madrid",
  "Berlin",
  "São Paulo",
  "Mexico City",
  "Sydney",
  "Toronto",
];
const DOMAINS = ["artist", "tv_show", "movie", "brand"] as const;
const PLACE_CATEGORIES = [
  "urn:tag:genre:place:restaurant:cafe",
  "urn:tag:genre:place:restaurant:bar",
  "urn:tag:genre:place:restaurant:pizza",
  "urn:tag:genre:place:restaurant:bakery",
  "urn:tag:category:place:park",
  "urn:tag:category:place:museum",
  "urn:tag:category:place:shopping_mall",
  "urn:tag:category:place:stadium",
];

const client = createQlooClient({
  ...getQlooEnv(),
  timeoutMs: 20_000,
  maxRetries: 4,
  onEmpty: () => {},
});

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

async function topIds(city: string, domain: string, pages: number): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; page <= pages; page++) {
    const r = await client.getInsights({
      filterType: `urn:entity:${domain}`,
      signalLocationQuery: city,
      take: 50,
      page,
    });
    ids.push(...r.entities.map((e) => e.id));
    if (r.entities.length < 50) break;
  }
  return ids;
}

async function placeDepth(city: string, tag: string): Promise<number> {
  let n = 0;
  for (let page = 1; page <= 3; page++) {
    const r = await client.getInsights({
      filterType: "urn:entity:place",
      filterTags: [tag],
      filterLocationQuery: city,
      signalLocationQuery: city,
      take: 50,
      page,
    });
    n += r.entities.length;
    if (r.entities.length < 50) break;
  }
  return n;
}

const lists: Record<string, Record<string, string[]>> = {};
await pool(
  CITIES.flatMap((c) => DOMAINS.map((d) => [c, d] as const)),
  4,
  async ([c, d]) => {
    (lists[d] ??= {})[c] = await topIds(c, d, 3);
  },
);
const places: Record<string, number[]> = {};
await pool(
  CITIES.flatMap((c) => PLACE_CATEGORIES.map((t, i) => [c, t, i] as const)),
  4,
  async ([c, t, i]) => {
    (places[c] ??= [])[i] = await placeDepth(c, t);
  },
);

const round = (x: number) => Math.round(x * 100) / 100;
const cities = Object.fromEntries(
  CITIES.map((city) => {
    const domains = Object.fromEntries(
      DOMAINS.map((d) => {
        const mine = lists[d][city].slice(0, 50);
        const others = CITIES.filter((o) => o !== city).map(
          (o) => new Set(lists[d][o].slice(0, 50)),
        );
        const distinct = mine.filter((id) => others.filter((s) => s.has(id)).length <= 1).length;
        return [
          d,
          { depth: lists[d][city].length, distinct: round(distinct / (mine.length || 1)) },
        ];
      }),
    );
    const categoryDepth = round(
      places[city].reduce((s, n) => s + Math.min(n, 150) / 150, 0) / PLACE_CATEGORIES.length,
    );
    return [city, { ...domains, place: { categoryDepth } }];
  }),
);

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/coverage.json",
  JSON.stringify(
    {
      measuredAt: new Date().toISOString().slice(0, 10),
      method: "scripts/measure-coverage.ts",
      cities,
    },
    null,
    2,
  ) + "\n",
);
console.log("city".padEnd(14), [...DOMAINS, "place"].map((d) => d.padStart(9)).join(""));
for (const [city, m] of Object.entries(cities) as [
  string,
  Record<string, { distinct?: number; categoryDepth?: number }>,
][]) {
  console.log(
    city.padEnd(14),
    [...DOMAINS.map((d) => m[d].distinct!), m.place.categoryDepth!]
      .map((x) => x.toFixed(2).padStart(9))
      .join(""),
  );
}
