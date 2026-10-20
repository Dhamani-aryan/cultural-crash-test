import { nameKey } from "@/lib/engine/stats";
import { DOMAINS, type Domain } from "@/lib/markets";
import type { EntityMatch, QlooClient } from "@/lib/qloo";
import type { Reference, ResolvedReference } from "./types";

const TYPE_TO_DOMAIN: Record<string, Domain> = Object.fromEntries(
  DOMAINS.map((d) => [`urn:entity:${d}`, d]),
);

export function domainOf(type: string | null): Domain | null {
  return type ? (TYPE_TO_DOMAIN[type] ?? null) : null;
}

/**
 * Pick the search result for a reference: an exact name (or aka) match of the guessed kind
 * first, then an exact match of any supported kind, then the top result of the guessed kind.
 */
export function pickMatch(
  name: string,
  kind: Reference["kind"],
  results: EntityMatch[],
): EntityMatch | null {
  const key = nameKey(name);
  const exact = results.filter((r) =>
    [r.name, r.displayName, ...r.akas].some((n) => nameKey(n) === key),
  );
  const supported = (r: EntityMatch) => domainOf(r.type) !== null;
  return (
    exact.find((r) => domainOf(r.type) === kind) ??
    exact.find(supported) ??
    results.find((r) => domainOf(r.type) === kind) ??
    null
  );
}

/** Find each reference in Qloo and load its full record (all tags) for the engine. */
export async function resolveReferences(
  client: QlooClient,
  references: Reference[],
): Promise<ResolvedReference[]> {
  const matches = await Promise.all(
    references.map(async (r) => {
      const types =
        r.kind === "other" ? DOMAINS.map((d) => `urn:entity:${d}`) : [`urn:entity:${r.kind}`];
      let results = await client.searchEntities({ query: r.name, types, take: 5 });
      let match = pickMatch(r.name, r.kind, results);
      if (!match && r.kind !== "other") {
        // The extractor's kind may be wrong (a podcast called a show, a café called a brand).
        results = await client.searchEntities({
          query: r.name,
          types: DOMAINS.map((d) => `urn:entity:${d}`),
          take: 5,
        });
        match = pickMatch(r.name, "other", results);
      }
      return match;
    }),
  );
  const ids = matches.filter((m): m is EntityMatch => m !== null).map((m) => m.id);
  const full = new Map(ids.length ? (await client.getEntities(ids)).map((e) => [e.id, e]) : []);
  return references.map((r, i) => {
    const m = matches[i];
    if (!m) return { ...r, entity: null, domain: null, note: "Not found in Qloo." };
    const entity = full.get(m.id) ?? m;
    const domain = domainOf(entity.type);
    return {
      ...r,
      entity,
      domain,
      note: domain ? null : "Qloo knows this, but its category isn't supported for translation.",
    };
  });
}
