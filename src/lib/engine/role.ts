import type { QlooEntity } from "@/lib/qloo";

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

/** The weighted role tags of an entity: tag ID → weight. */
export function roleTags(entity: Pick<QlooEntity, "tags">): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of entity.tags) {
    const w = tagWeight(t.type);
    if (w > 0) out.set(t.id, Math.max(out.get(t.id) ?? 0, w));
  }
  return out;
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
    return entity.tags.filter((t) => t.type === "urn:tag:genre:brand").map((t) => t.id);
  }
  if (domain === "place") {
    return entity.tags
      .filter((t) => t.type === "urn:tag:category:place")
      .map((t) => t.id)
      .slice(0, 3);
  }
  return [];
}
