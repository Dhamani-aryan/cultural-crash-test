import coverage from "../../data/coverage.json";

/**
 * The markets Transcreate supports. We launch only where Qloo's taste data is deep and
 * city-specific enough to trust (measured by scripts/measure-coverage.ts, stored in
 * data/coverage.json). Each domain gets a confidence grade; references in an "off" domain
 * are flagged for a human instead of translated.
 */

export const DOMAINS = ["artist", "tv_show", "movie", "brand", "place"] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABEL: Record<Domain, string> = {
  artist: "Music",
  tv_show: "TV",
  movie: "Film",
  brand: "Brands",
  place: "Places",
};

export type Confidence = "strong" | "usable" | "off";

export interface Market {
  id: string;
  /** Name passed to Qloo's `signal.location.query` / `filter.location.query`. */
  qlooLocation: string;
  label: string;
  country: string;
  /** Country names as they appear in Qloo's `release_country`, for the origin check. */
  releaseCountryNames: string[];
  language: string;
}

/** The source side: content written for a US audience. */
export const SOURCE_MARKET: Market = {
  id: "us",
  qlooLocation: "New York City",
  label: "United States",
  country: "US",
  releaseCountryNames: ["United States", "United States of America"],
  language: "English",
};

export const TARGET_MARKETS: Market[] = [
  {
    id: "tokyo",
    qlooLocation: "Tokyo",
    label: "Tokyo",
    country: "JP",
    releaseCountryNames: ["Japan"],
    language: "Japanese",
  },
  {
    id: "london",
    qlooLocation: "London",
    label: "London",
    country: "GB",
    releaseCountryNames: ["United Kingdom"],
    language: "British English",
  },
  {
    id: "mumbai",
    qlooLocation: "Mumbai",
    label: "Mumbai",
    country: "IN",
    releaseCountryNames: ["India"],
    language: "Hindi / English",
  },
  {
    id: "sao-paulo",
    qlooLocation: "São Paulo",
    label: "São Paulo",
    country: "BR",
    releaseCountryNames: ["Brazil"],
    language: "Portuguese",
  },
  {
    id: "madrid",
    qlooLocation: "Madrid",
    label: "Madrid",
    country: "ES",
    releaseCountryNames: ["Spain"],
    language: "Spanish",
  },
];

/** Cities used as the "everywhere else" baseline when measuring how local a candidate is. */
export const CONTROL_LOCATIONS = ["New York City", "London", "Tokyo", "Mumbai", "São Paulo", "Paris"];

type CityCoverage = Record<string, { distinct?: number; categoryDepth?: number }>;

/**
 * Grade from the measured coverage. Media and brands use distinctiveness (does Qloo know a
 * culture specific to this city?); places use category depth (are there enough venues?).
 */
export function gradeFromCoverage(domain: Domain, c: CityCoverage | undefined): Confidence {
  if (!c) return "off";
  if (domain === "place") {
    const depth = c.place?.categoryDepth ?? 0;
    return depth >= 0.45 ? "strong" : depth >= 0.3 ? "usable" : "off";
  }
  const distinct = c[domain]?.distinct ?? 0;
  return distinct >= 0.8 ? "strong" : distinct >= 0.4 ? "usable" : "off";
}

/**
 * Overrides where measured translation quality disagrees with raw coverage. Each one is
 * recorded in docs/DECISIONS.md with the evidence.
 */
const OVERRIDES: Partial<Record<string, Partial<Record<Domain, Confidence>>>> = {};

export function confidence(market: Market, domain: Domain): Confidence {
  const override = OVERRIDES[market.id]?.[domain];
  if (override) return override;
  const cities = coverage.cities as Record<string, CityCoverage>;
  return gradeFromCoverage(domain, cities[market.qlooLocation]);
}

export function marketById(id: string): Market | undefined {
  return TARGET_MARKETS.find((m) => m.id === id);
}
