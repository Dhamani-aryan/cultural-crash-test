import { nameKey } from "@/lib/engine/stats";
import type { Constraint } from "./types";

/**
 * Which hard rules code can fully verify. A lock is verified (the slot never changes); an
 * exclusion is verified when its wording says nothing beyond the names it lists ("No
 * collaboration with Supreme" with Supreme excluded). A rule whose words reach further ("No
 * fast-fashion collaborators", "No luxury collaboration") can't be fully checked by code, even
 * when some names come with it.
 */

const FILLER = new Set(
  "no not never avoid without use any a an the with of or and for to our we us collaboration collaborations collaborate collaborator collaborators partner partners partnership brand brands choice choices".split(
    " ",
  ),
);

export function isVerifiable(c: Constraint): boolean {
  if (c.kind !== "hard") return true;
  if (c.lockSlot) return true;
  const names = new Set((c.excludeNames ?? []).flatMap((n) => n.toLowerCase().split(/[^\p{L}\p{N}]+/u)));
  const rest = c.description
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !FILLER.has(w) && !names.has(w));
  return (c.excludeNames?.length ?? 0) > 0 && rest.length === 0;
}

/** The brief's hard rules that code cannot fully verify, in their own words. */
export function unverifiableRules(constraints: Constraint[]): string[] {
  return constraints.filter((c) => c.kind === "hard" && !isVerifiable(c)).map((c) => c.description);
}

export const sameName = (a: string, b: string) => nameKey(a) === nameKey(b);
