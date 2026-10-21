import type { QlooEntity } from "@/lib/qloo";
import { COUNTRY_TERMS } from "./origin";

/**
 * Role similarity: how alike two entities are in the *job* they do, measured by the Qloo tags
 * that describe character rather than facts. "Affordable, everyday, healthy-ish, for office
 * workers" is a role; "American companies established in 1993" is not, and neither is the
 * list of US competitor brands. Those factual tags are what made naive matching pull US
 * entities back in, so they're excluded here.
 */

/** Tag-type fragments (matched against `tag.type`) and their weight. Unlisted types are ignored. */
const ROLE_TYPE_WEIGHTS: [RegExp, number][] = [
  [/:genre\b|:subgenre\b|:category\b/, 2],
  [/:cuisine|:culinary_style|:offerings|:menu_highlight/, 1.5],
  [/:customer_segment|:audience|:lifestyle|:core_value|:cultural_relevance/, 1.5],
  [/:theme|:plot|:style|:character|:archetype|:emotional_tone|:mood/, 1],
  [/:aesthetic_property|:ambience|:decor|:setting|:good_for|:interests/, 1],
  [/:keyword:qloo/, 0.5],
];

/** Factual or origin-bound tag types, never part of a role. */
const EXCLUDED =
  /wikipedia_category|competitor_brand|business_model|brand_type|brand_subtype|inclusivity|amenity|nearby_attraction|keyword:media/;

export function tagWeight(type: string | null): number {
  if (!type || EXCLUDED.test(type)) return 0;
  for (const [pattern, weight] of ROLE_TYPE_WEIGHTS) if (pattern.test(type)) return weight;
  return 0;
}

/**
 * Wikipedia categories name what a thing *is* ("Doughnut shops", "Fast-food chains of the
 * United Kingdom", "2000s American workplace comedy television series"). With the country,
 * decade and place stripped they become country-neutral kinds that a US original and a local
 * equivalent can share: Dunkin' and Greggs are both "doughnut shops" and "fast-food chains".
 * Facts about the company (founding year, stock listing, head office) are dropped.
 */
const KIND_SKIP =
  /establish|disestablish|births|deaths|error|articles|wikidata|stub|listed on|nasdaq|stock exchange|merger|acquisition|based in|headquartered|people from|alumni|subsidiar|owned|ftse|s&p/;
const KIND_GENERIC = new Set([
  "",
  "companies",
  "brands",
  "restaurants",
  "retail companies",
  "food and drink companies",
  "multinational companies",
  "multinational food companies",
  "culture",
  "television series",
  "films",
  "musicians",
  "people",
  "organizations",
  "privately held companies",
]);
const NATIONALITY = new RegExp(
  `(^|[^\\p{L}])(${Object.values(COUNTRY_TERMS)
    .flat()
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?=[^\\p{L}]|$)`,
  "giu",
);

export function kindOf(category: string): string | null {
  const s = category.toLowerCase();
  if (KIND_SKIP.test(s)) return null;
  const kind = s
    .replace(/(?<!\bset)\s+(of|in|from)\s+.*$/u, "")
    .replace(/\b\d{2,4}s?\b/g, " ")
    .replace(NATIONALITY, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  return KIND_GENERIC.has(kind) ? null : kind;
}

export const KIND_PREFIX = "kind:";
const KIND_WEIGHT = 3;

/** The weighted role tags of an entity: tag ID → weight. Kinds use a `kind:` prefix. */
export function roleTags(entity: Pick<QlooEntity, "tags">): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of entity.tags) {
    if (t.type?.includes("wikipedia_category") && t.name) {
      const kind = kindOf(t.name);
      if (kind) out.set(KIND_PREFIX + kind, KIND_WEIGHT);
      continue;
    }
    // Most chains have an ordering app, so "Mobile App" says little about what a brand is.
    const w = isAppGenre(t) ? 0.5 : tagWeight(t.type);
    if (w > 0) out.set(t.id, Math.max(out.get(t.id) ?? 0, w));
  }
  return out;
}

const isAppGenre = (t: { name: string | null; type: string | null }) =>
  t.type === "urn:tag:genre:brand" && /apps?/i.test(t.name ?? "");

/** A role tag ID as a readable name ("kind:doughnut shops" → "Doughnut shops"). */
export function kindLabel(id: string): string | null {
  if (!id.startsWith(KIND_PREFIX)) return null;
  const k = id.slice(KIND_PREFIX.length);
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/** Weighted Jaccard over role tags (0–1), plus the shared tag IDs for the evidence card. */
export function roleSimilarity(
  anchor: Map<string, number>,
  candidate: Map<string, number>,
): { score: number; shared: string[] } {
  let inter = 0;
  let union = 0;
  const shared: string[] = [];
  for (const [id, w] of anchor) {
    const c = candidate.get(id);
    if (c !== undefined) {
      inter += Math.min(w, c);
      union += Math.max(w, c);
      shared.push(id);
    } else union += w;
  }
  for (const [id, w] of candidate) if (!anchor.has(id)) union += w;
  return { score: union > 0 ? inter / union : 0, shared };
}

/**
 * Broad category tags used to build the candidate pool for brands and places, so that a
 * restaurant chain is compared with restaurants, not with fashion labels. Media domains need
 * none: the entity type already is the category.
 */
export function categoryTags(entity: Pick<QlooEntity, "tags">, domain: string): string[] {
  if (domain === "brand") {
    // A coffee chain with an app is a coffee chain: app genres widen the pool to delivery and
    // ride-hailing apps, so they count only for brands that are nothing but apps.
    const genres = entity.tags.filter((t) => t.type === "urn:tag:genre:brand");
    const core = genres.filter((t) => !isAppGenre(t));
    return (core.length ? core : genres).map((t) => t.id);
  }
  if (domain === "place") {
    return entity.tags
      .filter((t) => t.type === "urn:tag:category:place")
      .map((t) => t.id)
      .slice(0, 3);
  }
  return [];
}
