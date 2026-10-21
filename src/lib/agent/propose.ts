import { z } from "zod";
import { mapLimit } from "@/lib/engine/stats";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import { DOMAINS, type Market } from "@/lib/markets";
import type { QlooClient, QlooEntity } from "@/lib/qloo";
import { findByName } from "./check";
import type { ResolvedReference } from "./types";

/**
 * The agent's own suggestions. Qloo's city lists rank what is *distinctive* in a city, which
 * can miss the obvious everyday equivalent (Greggs for Dunkin' in London). So the model names
 * a few local candidates it knows; each is looked up in Qloo, and the engine keeps it only if
 * it passes the same gates as everything else. A suggestion Qloo can't find is dropped.
 */

export const MAX_PROPOSALS = 4;

const schema = z.object({
  proposals: z.array(
    z.object({
      ref: z.string(),
      names: z.array(z.string()).describe("local equivalents, names only"),
      kind: z.enum(DOMAINS).describe("what the names are: artist, tv_show, movie, brand or place"),
    }),
  ),
});

const SYSTEM = `You are a transcreator who lives in the city named below. For each cultural reference in an American text, name up to ${MAX_PROPOSALS} local equivalents a reader in that city would instantly recognise and that do the same job in the sentence (same kind of thing, same connotation: cheap, premium, cosy, iconic...). Prefer things that are from the city or country, not American or global chains. Give names only, exactly as they are usually written, and the kind they are. Use the reference IDs as given.`;

export async function proposeCandidates(
  llm: LlmClient,
  client: QlooClient,
  input: { text: string; market: Market; references: ResolvedReference[] },
): Promise<Map<string, QlooEntity[]>> {
  const out = new Map<string, QlooEntity[]>();
  const refs = input.references.filter((r) => r.entity);
  if (refs.length === 0) return out;
  const { data } = await generateStructured(llm, {
    schema,
    system: SYSTEM,
    prompt: [
      `City: ${input.market.label}.`,
      `Text:\n"""\n${input.text}\n"""`,
      `References:\n${refs.map((r) => `${r.ref} "${r.surface}" (${r.domain}): ${r.job}`).join("\n")}`,
    ].join("\n\n"),
    label: `propose:${input.market.id}`,
  });
  const refNumber = (s: string) => s.match(/R?\s*(\d+)/i)?.[1];
  for (const p of data.proposals) {
    const ref = refs.find((r) => refNumber(r.ref) === refNumber(p.ref));
    if (!ref) continue;
    const found = await mapLimit(p.names.slice(0, MAX_PROPOSALS), 2, (name) =>
      findByName(client, name, p.kind).catch(() => null),
    );
    out.set(
      ref.ref,
      found.filter((e): e is QlooEntity => e !== null),
    );
  }
  return out;
}
