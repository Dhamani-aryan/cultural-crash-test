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
