import {
  CONTROL_LOCATIONS,
  SOURCE_LOCATIONS,
  confidence,
  type Confidence,
  type Domain,
  type Market,
} from "@/lib/markets";
import { AGE_BUCKETS, type Demographics, type QlooClient, type QlooEntity } from "@/lib/qloo";
import { isForeignOrigin } from "./origin";
import { categoryTags, roleSimilarity, roleTags } from "./role";
import { chunk, clamp01, cosine, mapLimit, nameKey } from "./stats";

/**
 * The equivalence engine: given a reference (the anchor) and a target market, find the local
 * entities that do the same job for a similar audience there. Deterministic: the same Qloo
 * answers always give the same ranking. The LLM never proposes equivalents; it only chooses
 * among these.
 *
 *   pool      top results for a location-only signal in the target city (+ broad category
 *             for brands and places)
 *   locality  how few control cities also have the candidate in their own top results
 *   gates     not global (in several cities' lists, or a worldwide superstar), not already
 *             familiar in the US, not of foreign origin, not a foreign TV/film release
 *   role      weighted Jaccard over role tags (genre, values, segment, tone…)
 *   audience  cosine of age/gender skews
 *   fame      position in the target city's list: will people there recognise it?
 *
 * Why not compare affinities across cities: under a location signal Qloo leaves out entities
 * that aren't distinctive there, so a missing score means "unknown", not "absent". Presence
 * in other cities' top lists is the robust test (and those lists are shared, so cacheable).
 */

export const WEIGHTS = { role: 0.45, locality: 0.25, audience: 0.15, fame: 0.15 } as const;
export const POOL_PAGES = 2;
export const CONTROL_COUNT = 4;
/** In this many control cities' top lists = known everywhere, not a local equivalent. */
export const GLOBAL_PRESENCE = 2;
/**
 * Qloo popularity is a worldwide (US-weighted) percentile. The biggest local stars top out
 * around 0.997 (Utada Hikaru, Caetano Veloso, Rosalía); global stars sit at 0.999+ (Bieber,
 * Shakira, Coldplay). Above this, an entity is known everywhere, so it isn't a local swap.
 */
export const SUPERSTAR_POPULARITY = 0.998;
/** How many top-scored candidates get the full-record origin check. */
export const FINALISTS = 12;
/** Two entities with identical audience skews and this much role overlap are the same one. */
export const SAME_ENTITY_ROLE = 0.5;

export interface ScoreParts {
  role: number;
  locality: number;
  audience: number | null;
  fame: number;
}

export interface Equivalent {
  entity: QlooEntity;
  score: number;
  parts: ScoreParts;
  /** Role tags shared with the anchor, as names, strongest first (for the evidence card). */
  sharedTags: string[];
  /** Rank in the target city's list (1 = most distinctive there) and the list length. */
  localRank: number;
  poolSize: number;
  /** Control cities whose top lists also contain it. */
  alsoIn: string[];
}

export type RejectReason =
  "global" | "familiar_in_source" | "foreign_origin" | "foreign_release" | "duplicate";

export interface EquivalentsResult {
  anchorId: string;
  marketId: string;
  domain: Domain;
  confidence: Confidence;
  equivalents: Equivalent[];
  rejected: { name: string; reason: RejectReason }[];
  poolSize: number;
  qlooCalls: number;
}

export interface FindInput {
  /** The anchor as a full record (from `getEntities`), so all its tags are present. */
  anchor: QlooEntity;
  domain: Domain;
  market: Market;
  take?: number;
  /** Extra entity IDs to keep out (e.g. other references already used in the text). */
  exclude?: string[];
}

const demoVector = (d: Demographics | undefined) =>
  d ? [...AGE_BUCKETS.map((k) => d.age[k]), d.femaleSkew] : null;

/** Chain stores share a name across cities ("Starbucks - Juhu"), so places compare by brand name. */
const chainKey = (name: string) => nameKey(name.split(/\s[-–|@(]\s?|,/)[0]);

/** The top results for one city: the target pool, or a control list for the global check. */
export async function cityList(
  client: QlooClient,
  domain: Domain,
  location: string,
  category: string[],
): Promise<QlooEntity[]> {
  const pages = await mapLimit(
    Array.from({ length: POOL_PAGES }, (_, i) => i + 1),
    POOL_PAGES,
    (page) =>
      client.getInsights({
        filterType: `urn:entity:${domain}`,
        signalLocationQuery: location,
        filterLocationQuery: domain === "place" ? location : undefined,
        filterTags: category.length ? category : undefined,
        filterTagsOperator: category.length ? "union" : undefined,
        take: 50,
        page,
      }),
  );
  return pages.flatMap((p) => p.entities);
}

export async function findEquivalents(
  client: QlooClient,
  input: FindInput,
): Promise<EquivalentsResult> {
  const { anchor, domain, market } = input;
  const take = input.take ?? 3;
  const grade = confidence(market, domain);
  const result: EquivalentsResult = {
    anchorId: anchor.id,
    marketId: market.id,
    domain,
    confidence: grade,
    equivalents: [],
    rejected: [],
    poolSize: 0,
    qlooCalls: 0,
  };
  if (grade === "off") return result;

  // 1. Target pool and control lists (one request set per city; identical across anchors).
  const category = categoryTags(anchor, domain);
  const controls = CONTROL_LOCATIONS.filter((c) => c !== market.qlooLocation).slice(
    0,
    CONTROL_COUNT,
  );
  const cities = [market.qlooLocation, ...controls, ...SOURCE_LOCATIONS];
  const lists = await mapLimit(cities, 3, (city) => cityList(client, domain, city, category));
  result.qlooCalls += cities.length * POOL_PAGES;
  let targetList = lists[0];
  if (domain === "place") {
    // Places are pinned to the city by the location filter, so co-affinity with the anchor is
    // safe here and finds the famous landmarks a "distinctive" list can miss (Hyde Park).
    result.qlooCalls++;
    const liked = await client.getInsights({
      filterType: "urn:entity:place",
      signalEntities: [anchor.id],
      filterLocationQuery: market.qlooLocation,
      filterTags: category.length ? category : undefined,
      filterTagsOperator: category.length ? "union" : undefined,
      take: 50,
    });
    const have = new Set(targetList.map((e) => e.id));
    targetList = [...targetList, ...liked.entities.filter((e) => !have.has(e.id))];
  }
  const keyOf = (e: QlooEntity) => (domain === "place" ? chainKey(e.name) : e.id);
  const controlSets = lists.slice(1, 1 + controls.length).map((list) => new Set(list.map(keyOf)));
  const sourceSet = new Set(lists.slice(1 + controls.length).flatMap((list) => list.map(keyOf)));

  // 2. Clean the pool: drop the anchor, repeats and the same entity under another name.
  const excluded = new Set([anchor.id, ...(input.exclude ?? [])]);
  const seenIds = new Set<string>();
  const seenNames = new Set([
    nameKey(anchor.displayName),
    nameKey(anchor.name),
    ...anchor.akas.map(nameKey),
  ]);
  const pool: { entity: QlooEntity; rank: number }[] = [];
  targetList.forEach((entity, i) => {
    if (excluded.has(entity.id) || seenIds.has(entity.id)) return;
    seenIds.add(entity.id);
    const keys = [entity.displayName, entity.name, ...entity.akas].map(nameKey).filter(Boolean);
    if (keys.some((k) => seenNames.has(k))) {
      result.rejected.push({ name: entity.displayName, reason: "duplicate" });
      return;
    }
    keys.forEach((k) => seenNames.add(k));
    pool.push({ entity, rank: i + 1 });
  });
  result.poolSize = targetList.length;
  if (pool.length === 0) return result;

  // 3. Audience skews (anchor first). Identical skews also reveal one person under two names.
  const demos = new Map<string, Demographics>();
  for (const batch of chunk([anchor.id, ...pool.map((p) => p.entity.id)], 50)) {
    result.qlooCalls++;
    for (const d of await client.getDemographics(batch)) demos.set(d.entityId, d);
  }
  const anchorDemo = demoVector(demos.get(anchor.id));
  const seenDemos = new Map<string, Map<string, number>>();
  const kept: { key: string; role: Map<string, number> }[] = [];

  // 4. Gates and score parts.
  const anchorRole = roleTags(anchor);
  const tagName = new Map<string, string>();
  for (const t of [...anchor.tags, ...pool.flatMap((p) => p.entity.tags)]) {
    if (t.name) tagName.set(t.id, t.name);
  }
  const scored: Equivalent[] = [];
  for (const { entity, rank } of pool) {
    const reject = (reason: RejectReason) =>
      result.rejected.push({ name: entity.displayName, reason });
    const demo = demoVector(demos.get(entity.id));
    const entityRole = roleTags(entity);
    // Same audience skew to the last decimal *and* largely the same tags: one entity listed
    // twice (e.g. "Jin Akanishi" and "赤西仁"). The skew alone isn't enough, because sparse
    // entities can share a default skew.
    const demoKey = demo && demo.some((x) => x !== 0) ? demo.join(",") : null;
    const twin = demoKey ? seenDemos.get(demoKey) : undefined;
    if (twin && roleSimilarity(twin, entityRole).score >= SAME_ENTITY_ROLE) {
      reject("duplicate");
      continue;
    }
    if (demoKey && !twin) seenDemos.set(demoKey, entityRole);
    // "Anushka" and "Anushka Manchanda": one name extends the other and the tags agree.
    const key = nameKey(entity.displayName);
    const extended = kept.find(
      (k) =>
        (key.startsWith(k.key) || k.key.startsWith(key)) &&
        Math.min(key.length, k.key.length) >= 4 &&
        roleSimilarity(k.role, entityRole).score >= SAME_ENTITY_ROLE,
    );
    if (extended) {
      reject("duplicate");
      continue;
    }
    kept.push({ key, role: entityRole });

    const alsoIn = controls.filter((_, i) => controlSets[i].has(keyOf(entity)));
    // Places are physically local, so a worldwide-famous landmark (Hyde Park) is exactly the
    // equivalent we want; the superstar gate applies to media, people and brands only.
    const superstar = domain !== "place" && (entity.popularity ?? 0) >= SUPERSTAR_POPULARITY;
    if (alsoIn.length >= GLOBAL_PRESENCE || superstar) {
      reject("global");
      continue;
    }
    if (sourceSet.has(keyOf(entity))) {
      reject("familiar_in_source");
      continue;
    }
    if (isForeignOrigin(entity, market.country)) {
      reject("foreign_origin");
      continue;
    }
    if (
      (domain === "tv_show" || domain === "movie") &&
      entity.releaseCountries.length > 0 &&
      !entity.releaseCountries.some((c) => market.releaseCountryNames.includes(c))
    ) {
      reject("foreign_release");
      continue;
    }

    const role = roleSimilarity(anchorRole, entityRole);
    const sharedNames = [
      ...new Set(
        role.shared
          .sort((a, b) => (anchorRole.get(b) ?? 0) - (anchorRole.get(a) ?? 0))
          .map((id) => tagName.get(id) ?? id),
      ),
    ];
    scored.push({
      entity,
      score: 0,
      parts: {
        role: role.score,
        locality: 1 - alsoIn.length / (controls.length || 1),
        audience: anchorDemo && demo ? clamp01((cosine(anchorDemo, demo) + 1) / 2) : null,
        // For places, how famous the landmark is matters more than how distinctive it is.
        fame:
          domain === "place"
            ? (entity.popularity ?? 0)
            : 1 - (rank - 1) / Math.max(1, targetList.length - 1),
      },
      sharedTags: sharedNames.slice(0, 6),
      localRank: rank,
      poolSize: targetList.length,
      alsoIn,
    });
  }

  // Role Jaccard is small in absolute terms (~100 tags each side), so each part is scaled to
  // the pool's range before weighting. Unknown audience counts as the pool's middle.
  const scaler = (values: number[]) => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    return (x: number) => (hi > lo ? (x - lo) / (hi - lo) : 1);
  };
  const role = scaler(scored.map((s) => s.parts.role));
  const audienceKnown = scored.map((s) => s.parts.audience).filter((a): a is number => a !== null);
  const audience = scaler(audienceKnown.length ? audienceKnown : [0]);
  for (const s of scored) {
    s.score =
      WEIGHTS.role * role(s.parts.role) +
      WEIGHTS.locality * s.parts.locality +
      WEIGHTS.audience * (s.parts.audience === null ? 0.5 : audience(s.parts.audience)) +
      WEIGHTS.fame * s.parts.fame;
  }
  scored.sort((a, b) => b.score - a.score || a.localRank - b.localRank);

  // 5. Origin re-check on the finalists. Insights results omit Wikipedia categories, so mass
  //    chains (Pizza Hut, Olive Garden) only reveal their origin in the full record.
  const finalists = scored.slice(0, FINALISTS);
  if (finalists.length) {
    result.qlooCalls++;
    const full = new Map(
      (await client.getEntities(finalists.map((s) => s.entity.id))).map((e) => [e.id, e]),
    );
    for (const s of finalists) {
      const record = full.get(s.entity.id);
      if (record && isForeignOrigin(record, market.country)) {
        result.rejected.push({ name: s.entity.displayName, reason: "foreign_origin" });
        continue;
      }
      if (record) {
        s.entity = {
          ...s.entity,
          description: record.description ?? s.entity.description,
          shortDescription: record.shortDescription ?? s.entity.shortDescription,
        };
      }
      result.equivalents.push(s);
      if (result.equivalents.length === take) break;
    }
  }
  return result;
}
