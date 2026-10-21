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

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 1 && t !== "the"),
  );

/** Share of the query's words that appear in the name (0–1). */
export function nameOverlap(query: string, name: string): number {
  const q = tokens(query);
  if (q.size === 0) return 0;
  const n = tokens(name);
  return [...q].filter((t) => n.has(t)).length / q.size;
}

/**
 * Pick the search result for a reference: an exact name (or aka) match of the guessed kind
 * first, then an exact match of any supported kind, then a close match of the guessed kind.
 * Never just the top result: "The Office (US)" once resolved to an unrelated show that way.
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
  const close = (r: EntityMatch) =>
    [r.name, r.displayName].some(
      (n) => nameOverlap(name, n) >= 0.75 && nameOverlap(n, name) >= 0.5,
    );
  return (
    exact.find((r) => domainOf(r.type) === kind) ??
    exact.find(supported) ??
    results.find((r) => domainOf(r.type) === kind && close(r)) ??
    null
  );
}

/** Names to try, most specific first: as given, without "(US)"-style notes, as written. */
export function lookupNames(r: Pick<Reference, "name" | "surface">): string[] {
  const bare = r.name.replace(/\s*[([].*?[)\]]\s*/g, " ").trim();
  return [...new Set([r.name, bare, r.surface].filter(Boolean))];
}

/** Find each reference in Qloo and load its full record (all tags) for the engine. */
export async function resolveReferences(
  client: QlooClient,
  references: Reference[],
): Promise<ResolvedReference[]> {
  const all = DOMAINS.map((d) => `urn:entity:${d}`);
  const matches = await Promise.all(
    references.map(async (r) => {
      // The extractor's kind may be wrong (a podcast called a show, a café called a brand), so
      // each name is tried with the guessed kind first, then with every supported kind.
      const attempts: [string, string[]][] = lookupNames(r).flatMap((name) =>
        r.kind === "other"
          ? [[name, all] as [string, string[]]]
          : [
              [name, [`urn:entity:${r.kind}`]] as [string, string[]],
              [name, all] as [string, string[]],
            ],
      );
      for (const [query, types] of attempts) {
        const results = await client.searchEntities({ query, types, take: 5 });
        const match = pickMatch(query, r.kind, results);
        if (match) return match;
      }
      return null;
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
