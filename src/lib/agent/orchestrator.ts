import { findEquivalents, type EquivalentsResult } from "@/lib/engine/equivalents";
import { mapLimit } from "@/lib/engine/stats";
import type { LlmClient } from "@/lib/llm/types";
import { marketById, type Market } from "@/lib/markets";
import type { QlooClient } from "@/lib/qloo";
import { runBaseline } from "./baseline";
import { applyDecisions, decide } from "./decide";
import { MAX_TEXT, extractReferences } from "./extract";
import { resolveReferences } from "./resolve";
import { rewriteForMarket } from "./rewrite";
import type {
  AgentEvent,
  Decision,
  MarketResult,
  ResolvedReference,
  TranscreateResult,
} from "./types";

export const MAX_MARKETS = 3;
const CANDIDATES = 5;

export interface TranscreateInput {
  text: string;
  marketIds: string[];
  /** Skip the model-only comparison (e.g. in evaluation reruns). */
  skipBaseline?: boolean;
}

/** Count calls without changing behaviour, for the stats line and the evaluation. */
function counting<T extends object>(target: T, counter: { n: number }): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        counter.n++;
        return value.apply(obj, args);
      };
    },
  });
}

export async function runTranscreate(
  deps: { qloo: QlooClient; llm: LlmClient },
  input: TranscreateInput,
  emit: (e: AgentEvent) => void = () => {},
): Promise<TranscreateResult> {
  const started = Date.now();
  const qlooCount = { n: 0 };
  const llmCount = { n: 0 };
  const qloo = counting(deps.qloo, qlooCount);
  const llm = counting(deps.llm, llmCount);

  const text = input.text.trim().slice(0, MAX_TEXT);
  const markets = input.marketIds
    .map(marketById)
    .filter((m): m is Market => Boolean(m))
    .slice(0, MAX_MARKETS);
  if (!text) throw new Error("Paste some text to translate.");
  if (markets.length === 0) throw new Error("Choose at least one market.");

  emit({ type: "stage", stage: "extract", message: "Finding the cultural references" });
  const { references } = await extractReferences(llm, text);

  emit({
    type: "stage",
    stage: "resolve",
    message: `Looking up ${references.length} references in Qloo`,
  });
  const resolved = await resolveReferences(qloo, references);
  emit({ type: "references", references: resolved });

  const baseline = input.skipBaseline
    ? Promise.resolve([])
    : runBaseline(llm, qloo, text, markets).catch(() => []);

  const marketResults = await mapLimit(markets, 2, async (market) => {
    emit({
      type: "stage",
      stage: `market:${market.id}`,
      message: `Searching ${market.label}'s taste data`,
    });
    const result = await translateForMarket({ qloo, llm }, text, market, resolved, emit);
    emit({ type: "market", result });
    return result;
  });

  const baselineResults = await baseline;
  emit({ type: "baseline", result: baselineResults });

  const result: TranscreateResult = {
    original: text,
    references: resolved,
    markets: marketResults,
    baseline: baselineResults,
    stats: { qlooCalls: qlooCount.n, llmCalls: llmCount.n, ms: Date.now() - started },
  };
  emit({ type: "done", result });
  return result;
}

async function translateForMarket(
  deps: { qloo: QlooClient; llm: LlmClient },
  text: string,
  market: Market,
  references: ResolvedReference[],
  emit: (e: AgentEvent) => void,
): Promise<MarketResult> {
  const otherIds = references.flatMap((r) => (r.entity ? [r.entity.id] : []));
  const equivalents = new Map<string, EquivalentsResult>();
  await mapLimit(references, 2, async (r) => {
    if (!r.entity || !r.domain) return;
    equivalents.set(
      r.ref,
      await findEquivalents(deps.qloo, {
        anchor: r.entity,
        domain: r.domain,
        market,
        take: CANDIDATES,
        exclude: otherIds,
      }),
    );
  });

  // Round 1: decide with the option of searching another kind of culture.
  const raw = await decide(deps.llm, {
    text,
    market,
    references,
    equivalents,
    allowTryDomain: true,
  });
  const first = applyDecisions(references, raw, equivalents, true);
  const decisions: Decision[] = [...first.decisions];

  // Round 2: for references the agent wanted to re-search, run the engine in that domain.
  if (first.tryDomain.length) {
    const retry = references.filter((r) => first.tryDomain.some((t) => t.ref === r.ref));
    await mapLimit(first.tryDomain, 2, async ({ ref, domain }) => {
      const r = references.find((x) => x.ref === ref)!;
      emit({
        type: "stage",
        stage: `retry:${market.id}:${ref}`,
        message: `No good fit for "${r.surface}"; searching ${market.label}'s ${domain.replace("_", " ")} data instead`,
      });
      equivalents.set(
        ref,
        await findEquivalents(deps.qloo, {
          anchor: r.entity!,
          domain,
          market,
          take: CANDIDATES,
          exclude: otherIds,
        }),
      );
    });
    const raw2 = await decide(deps.llm, {
      text,
      market,
      references: retry,
      equivalents,
      allowTryDomain: false,
    });
    const second = applyDecisions(retry, raw2, equivalents, false);
    for (const d of second.decisions) {
      const tried = first.tryDomain.find((t) => t.ref === d.ref)!.domain;
      decisions.push({ ...d, triedDomain: tried });
    }
  }
  decisions.sort((a, b) => Number(a.ref.slice(1)) - Number(b.ref.slice(1)));
  for (const d of decisions) emit({ type: "decision", marketId: market.id, decision: d });

  const rewritten = await rewriteForMarket(deps.llm, { text, market, references, decisions });
  return { marketId: market.id, decisions, ...rewritten };
}
