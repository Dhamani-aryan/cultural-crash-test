import { z } from "zod";
import { isForeignOrigin } from "@/lib/engine/origin";
import { nameKey } from "@/lib/engine/stats";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import type { Market } from "@/lib/markets";
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
      swaps: z.array(z.object({ original: z.string(), replacement: z.string() })),
    }),
  ),
});

const SYSTEM = `You are a transcreation specialist. Rewrite American copy for readers in other cities, in English, replacing cultural references (brands, artists, shows, films, places) with local equivalents that carry the same meaning. Keep the tone and structure. List every swap you make.`;

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
          const hits = await client.searchEntities({ query: s.replacement, take: 3 });
          const hit = hits.find((h) =>
            [h.name, h.displayName, ...h.akas].some((n) => nameKey(n) === nameKey(s.replacement)),
          );
          if (!hit) return { ...s, check: "not_in_qloo" as const };
          const [full] = await client.getEntities([hit.id]);
          const e = full ?? hit;
          if (isForeignOrigin(e, market.country)) return { ...s, check: "foreign" as const };
          return {
            ...s,
            check: (e === hit ? "unknown_origin" : "local") as "local" | "unknown_origin",
          };
        }),
      );
      return { marketId: r.marketId, text: r.text, swaps };
    }),
  );
}
