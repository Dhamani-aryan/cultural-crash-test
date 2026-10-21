import type { Market } from "@/lib/markets";
import type { QlooEntity } from "@/lib/qloo";

const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

/**
 * The name readers in the city know it by. Qloo often lists local shows under an English
 * translation ("No One Could Live Here"); a Latin-script aka in the city's language
 * ("Aquí no hay quien viva") is what people there actually say.
 */
export function localName(
  e: Pick<QlooEntity, "displayName" | "name" | "akaLanguages">,
  market: Pick<Market, "languageCodes">,
): string {
  const local = (e.akaLanguages ?? []).find(
    (a) =>
      LATIN.test(a.value) &&
      a.languages.some((l) => market.languageCodes.includes(l.slice(0, 2).toLowerCase())),
  );
  return local?.value ?? e.displayName;
}

/** Trailing words a brand's listed name carries but people don't say ("Leon Restaurants"). */
const GENERIC_SUFFIX =
  /\s+(restaurants?|stores?|supermarkets?|shops?|inc\.?|ltd\.?|limited|group|plc|co\.?|company|corporation)$/i;

/** The everyday form of a name: "Leon Restaurants" → "Leon". */
export function shortName(name: string): string {
  const short = name.replace(GENERIC_SUFFIX, "").trim();
  return short.length >= 3 ? short : name;
}

/** The ways a name may legitimately appear: as listed, without a leading "The", or shortened. */
export function nameForms(e: { displayName: string; name: string; akas: string[] }): string[] {
  const names = [e.displayName, e.name, ...e.akas];
  const forms = names.flatMap((n) => [n, n.replace(/^the\s+/i, ""), shortName(n)]);
  return [...new Set(forms)].filter((n) => n.length > 1);
}
