import type { QlooEntity } from "@/lib/qloo";

/**
 * Where an entity comes from. Three signals, strongest first:
 * - brands: Qloo `key_market` tags ("Spain", "United States");
 * - big chains: `wikipedia_category` tags ("American companies established in 1971");
 * - people: the short description, which usually opens with a nationality ("English singer").
 * Many local entities carry none of these, so a missing origin means unknown, never foreign.
 */

/** Country → words that name it. */
export const COUNTRY_TERMS: Record<string, string[]> = {
  US: [
    "american",
    "united states",
    "u.s.",
    "usa",
    "new york",
    "california",
    "seattle",
    "florida",
    "texas",
  ],
  GB: [
    "british",
    "united kingdom",
    "english",
    "england",
    "london",
    "scottish",
    "scotland",
    "welsh",
    "wales",
  ],
  IE: ["irish", "ireland"],
  JP: ["japanese", "japan", "tokyo", "osaka"],
  IN: ["indian", "india", "mumbai", "bollywood", "delhi"],
  BR: ["brazilian", "brazil", "são paulo", "sao paulo", "rio de janeiro"],
  ES: ["spanish", "spain", "madrid", "barcelona", "catalan"],
  AU: ["australian", "australia", "sydney", "melbourne"],
  CA: ["canadian", "canada", "toronto"],
  MX: ["mexican", "mexico"],
  PR: ["puerto rican", "puerto rico"],
  CO: ["colombian", "colombia"],
  AR: ["argentine", "argentinian", "argentina"],
  FR: ["french", "france", "paris"],
  DE: ["german", "germany", "berlin"],
  IT: ["italian", "italy", "milan"],
  KR: ["south korean", "korean", "korea", "seoul"],
  CN: ["chinese", "china", "hong kong"],
  SE: ["swedish", "sweden"],
  BB: ["barbadian", "barbados"],
  AE: ["emirati", "uae", "united arab emirates", "dubai"],
  PK: ["pakistani", "pakistan"],
  NG: ["nigerian", "nigeria"],
};

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_RE = Object.entries(COUNTRY_TERMS).map(
  ([country, terms]) =>
    [
      country,
      new RegExp(`(^|[^\\p{L}])(${terms.map(escape).join("|")})([^\\p{L}]|$)`, "iu"),
    ] as const,
);

function countriesIn(text: string): string[] {
  return TERM_RE.filter(([, re]) => re.test(text)).map(([c]) => c);
}

/**
 * The nationality a description opens with: the earliest country word in the first sentence
 * ("Nick Jonas is an American singer…" → US). "Japanese-inspired" style compounds are
 * ignored, since they describe a cuisine rather than an origin.
 */
export function descriptionOrigin(text: string | null): string | null {
  if (!text) return null;
  const first = text
    .split(/(?<=[.!?])\s/)[0]
    .replace(/\b[\p{L}]+-(inspired|style|themed)\b/giu, "");
  let best: { country: string; at: number } | null = null;
  for (const [country, re] of TERM_RE) {
    const m = re.exec(first);
    if (m && (best === null || m.index < best.at)) best = { country, at: m.index };
  }
  return best?.country ?? null;
}

/** Countries an entity is known to come from (possibly several, possibly none). */
export function originCountries(
  entity: Pick<QlooEntity, "tags" | "shortDescription" | "type" | "name">,
): string[] {
  // Wikipedia categories name where a company is from ("Clothing brands of Japan"). Key markets
  // are where it sells (DC Shoes: US, Europe, Australia, Japan, Brazil), so they only stand in
  // for origin when there is exactly one.
  const wiki = entity.tags
    .filter((t) => t.type?.includes("wikipedia_category") && t.name)
    .flatMap((t) => countriesIn(t.name!));
  if (wiki.length) return [...new Set(wiki)];
  const keyMarkets = [
    ...new Set(
      entity.tags.filter((t) => t.type?.includes("key_market") && t.name).flatMap((t) => countriesIn(t.name!)),
    ),
  ];
  if (keyMarkets.length === 1) return keyMarkets;
  // Descriptions name a person's nationality reliably; for brands and shows they often
  // describe the product ("Italian restaurant chain"), so only people use this signal.
  if (entity.type === "urn:entity:artist" || entity.type === "urn:entity:person") {
    const d = descriptionOrigin(entity.shortDescription);
    return d ? [d] : [];
  }
  // Last resort for brands: a country in the name itself ("The Bagel Bar Coffee House UAE").
  return countriesIn(entity.name);
}

/** True when the entity's known origins exclude the target country. */
export function isForeignOrigin(
  entity: Pick<QlooEntity, "tags" | "shortDescription" | "type" | "name">,
  country: string,
): boolean {
  const origins = originCountries(entity);
  return origins.length > 0 && !origins.includes(country);
}
