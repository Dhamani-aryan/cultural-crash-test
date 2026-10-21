import { z } from "zod";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import { checkPick, findByName } from "./check";
import { DOMAINS, type Market } from "@/lib/markets";
import type { QlooClient } from "@/lib/qloo";
import type { BaselineResult } from "./types";

/**
 * The comparison: the same model localizes the same text with no Qloo data. Each swap it
 * makes is then looked up in Qloo, which shows what an ungrounded model tends to do (pick
 * names Qloo doesn't know, or "local" picks that are actually foreign). It's provenance, not
 * proof of quality, and the UI says so.
 */

const schema = z.object({
  markets: z.array(
    z.object({
      marketId: z.string(),
      text: z.string(),
      swaps: z.array(
        z.object({
          original: z.string().describe("the original name only, e.g. Central Park"),
          replacement: z.string().describe("the new name only, no extra words"),
          kind: z
            .enum(DOMAINS)
            .describe("what the replacement is: artist, tv_show, movie, brand or place"),
        }),
      ),
    }),
  ),
});

const SYSTEM = `You are a transcreation specialist. Rewrite American copy for readers in other cities, in English, replacing cultural references (brands, artists, shows, films, places) with local equivalents that carry the same meaning. Keep the tone and structure. List every swap you make, as names only (e.g. "Central Park" → "Hyde Park", not "Central Park in June").`;

export async function runBaseline(
  llm: LlmClient,
  client: QlooClient,
  text: string,
  markets: Market[],
): Promise<BaselineResult[]> {
  const { data } = await generateStructured(llm, {
    schema,
    system: SYSTEM,
    prompt: `Markets: ${markets.map((m) => `${m.id} (${m.label})`).join(", ")}.\n\nText:\n"""\n${text}\n"""`,
    label: "baseline",
  });
  const wanted = new Set(markets.map((m) => m.id));
  const results = data.markets.filter((m) => wanted.has(m.marketId));
  return Promise.all(
    results.map(async (r) => {
      const market = markets.find((m) => m.id === r.marketId)!;
      const swaps = await Promise.all(
        r.swaps.slice(0, 10).map(async (s) => {
          // Search by the stated kind first, so "Pão de Açúcar" the supermarket isn't mistaken
          // for Sugarloaf Mountain.
          const pick = await findByName(client, s.replacement, s.kind);
          const c = await checkPick(client, { pick, anchor: null, market });
          const check = !c.found
            ? ("not_in_qloo" as const)
            : c.foreign
              ? ("foreign" as const)
              : c.localEvidence
                ? ("local_evidence" as const)
                : ("no_local_evidence" as const);
          return { original: s.original, replacement: s.replacement, kind: s.kind, check };
        }),
      );
      return { marketId: r.marketId, text: r.text, swaps };
    }),
  );
}
