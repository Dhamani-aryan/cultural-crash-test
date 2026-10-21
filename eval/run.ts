/**
 * Evaluation run.
 *
 *   npm run live eval/run.ts              # every case
 *   npm run live eval/run.ts -- coffee    # some cases by id
 *
 * For every case and market: run the full agent live (with the model-only comparison), then
 * judge every pick from both sides with the same Qloo checks (src/lib/agent/check.ts), run the
 * case's deterministic expectations, and ask a blind judge to compare the two rewrites.
 *
 * Writes eval/out/results.json (git-ignored: contains Qloo-derived results). The committed
 * report, docs/EVALUATION.md, is built from it by eval/report.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkPick, findByName, type PickCheck } from "../src/lib/agent/check";
import { runTranscreate } from "../src/lib/agent/orchestrator";
import type { ResolvedReference, TranscreateResult } from "../src/lib/agent/types";
import { createMemoryCache } from "../src/lib/cache/cache";
import { nameKey } from "../src/lib/engine/stats";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import type { LlmClient } from "../src/lib/llm/types";
import { marketById } from "../src/lib/markets";
import { createQlooClient, type QlooClient } from "../src/lib/qloo";
import { withCache } from "../src/lib/qloo/cached";
import { nameForms } from "../src/lib/agent/names";
import { CASES, type EvalCase } from "./cases";
import { judgePair, type JudgeScores, type Verdict } from "./judge";

export type { JudgeScores };

const OUT = "eval/out";
const FILE = `${OUT}/results.json`;

export interface PickRow {
  original: string;
  pick: string;
  /** Every name the pick may appear under (local titles, akas). */
  names: string[];
  domain: string | null;
  check: Omit<PickCheck, "entity"> & { popularity: number | null };
}

export interface MarketRow {
  marketId: string;
  original: string;
  transcreate: {
    text: string;
    swaps: PickRow[];
    kept: string[];
    flagged: string[];
    triedDomain: number;
    fallback: boolean;
    guardIssues: string[];
  };
  baseline: { text: string; swaps: PickRow[] } | null;
  expectations: { name: string; pass: boolean; detail: string }[];
  judge: Verdict | null;
}

export interface CaseRow {
  id: string;
  label: string;
  split: EvalCase["split"];
  references: { surface: string; found: string | null; domain: string | null }[];
  markets: MarketRow[];
  stats: TranscreateResult["stats"];
  error: string | null;
}

const toRow = (original: string, c: PickCheck): PickRow => {
  const { entity, ...rest } = c;
  return {
    original,
    pick: entity?.displayName ?? "",
    names: entity ? nameForms(entity) : [],
    domain: entity?.type?.replace("urn:entity:", "") ?? null,
    check: { ...rest, popularity: entity?.popularity ?? null },
  };
};

/** The reference a model-only swap replaced, matched by name. */
function anchorFor(original: string, refs: ResolvedReference[]): ResolvedReference | undefined {
  const k = nameKey(original);
  return refs.find((r) =>
    [r.name, r.surface, r.entity?.displayName ?? ""]
      .map(nameKey)
      .some((n) => n && (n === k || n.includes(k) || k.includes(n))),
  );
}

function expectations(c: EvalCase, marketId: string, text: string, row: MarketRow["transcreate"]) {
  const out: MarketRow["expectations"] = [];
  for (const name of c.mustKeep ?? []) {
    out.push({
      name: `keeps ${name}`,
      pass: text.includes(name),
      detail: text.includes(name) ? "kept" : "removed or changed",
    });
  }
  if (c.unchanged) {
    out.push({
      name: "leaves text unchanged",
      pass: text === c.text,
      detail: text === c.text ? "unchanged" : "changed",
    });
  }
  for (const rule of c.noSwap ?? []) {
    if (rule.market !== marketId) continue;
    const bad = row.swaps.filter((s) => s.domain === rule.domain);
    out.push({
      name: `no ${rule.domain} swap in ${marketId}`,
      pass: bad.length === 0,
      detail: bad.length ? bad.map((b) => b.pick).join(", ") : "none",
    });
  }
  // Always: every swapped name actually appears in the output, and no fallback was needed.
  const missing = row.swaps.filter((s) => !s.names.some((n) => text.includes(n)));
  out.push({
    name: "every chosen name is in the text",
    pass: missing.length === 0,
    detail: missing.length ? missing.map((m) => m.pick).join(", ") : "all present",
  });
  out.push({
    name: "rewrite passed the name guard",
    pass: !row.fallback,
    detail: row.fallback ? row.guardIssues.join(", ") : "clean",
  });
  return out;
}

async function runCase(qloo: QlooClient, llm: LlmClient, c: EvalCase): Promise<CaseRow> {
  const result = await runTranscreate({ qloo, llm }, { text: c.text, marketIds: c.markets });
  const refs = result.references;
  const markets: MarketRow[] = [];
  for (const m of result.markets) {
    const market = marketById(m.marketId)!;
    const swaps: PickRow[] = [];
    for (const d of m.decisions.filter((d) => d.action === "swap" && d.choice)) {
      const ref = refs.find((r) => r.ref === d.ref)!;
      const [full] = await qloo.getEntities([d.choice!.entity.id]);
      const check = await checkPick(qloo, {
        pick: full ?? d.choice!.entity,
        anchor: ref.entity,
        market,
      });
      // Show the name the city knows (the orchestrator's local name), not Qloo's English one.
      const row = toRow(ref.surface, check);
      swaps.push({ ...row, pick: d.choice!.entity.displayName });
    }
    const name = (ref: string) => refs.find((r) => r.ref === ref)?.surface ?? ref;
    const row: MarketRow["transcreate"] = {
      text: m.text,
      swaps,
      kept: m.decisions.filter((d) => d.action === "keep").map((d) => name(d.ref)),
      flagged: m.decisions.filter((d) => d.action === "flag").map((d) => name(d.ref)),
      triedDomain: m.decisions.filter((d) => d.triedDomain).length,
      fallback: m.note !== null,
      guardIssues: m.guardIssues,
    };

    const b = result.baseline.find((x) => x.marketId === m.marketId);
    let baseline: MarketRow["baseline"] = null;
    if (b) {
      const bSwaps: PickRow[] = [];
      for (const s of b.swaps) {
        const anchor = anchorFor(s.original, refs);
        const pick = await findByName(qloo, s.replacement, s.kind);
        const check = await checkPick(qloo, { pick, anchor: anchor?.entity ?? null, market });
        const r = toRow(s.original, check);
        bSwaps.push({
          ...r,
          pick: s.replacement,
          names: [s.replacement, ...r.names],
          domain: r.domain ?? s.kind,
        });
      }
      baseline = { text: b.text, swaps: bSwaps };
    }

    let verdict: MarketRow["judge"] = null;
    if (baseline && (row.swaps.length || baseline.swaps.length)) {
      verdict = await judgePair(llm, market, c.text, m.text, baseline.text).catch(() => null);
    }
    markets.push({
      marketId: m.marketId,
      original: c.text,
      transcreate: row,
      baseline,
      expectations: expectations(c, m.marketId, m.text, row),
      judge: verdict,
    });
  }
  return {
    id: c.id,
    label: c.label,
    split: c.split,
    references: refs.map((r) => ({
      surface: r.surface,
      found: r.entity?.displayName ?? null,
      domain: r.domain,
    })),
    markets,
    stats: result.stats,
    error: null,
  };
}

const only = process.argv.slice(2).filter((a) => a !== "--");
const qloo = withCache(
  createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} }),
  createMemoryCache(20_000),
);
const llm = getLlm();
mkdirSync(OUT, { recursive: true });
// Re-running some cases updates just those rows.
const previous: CaseRow[] = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).cases : [];
const rows = new Map(previous.map((r) => [r.id, r]));

for (const c of CASES.filter((x) => only.length === 0 || only.includes(x.id))) {
  const started = Date.now();
  process.stdout.write(`${c.id} … `);
  let row: CaseRow;
  try {
    row = await runCase(qloo, llm, c);
  } catch (err) {
    row = {
      id: c.id,
      label: c.label,
      split: c.split,
      references: [],
      markets: [],
      stats: { qlooCalls: 0, llmCalls: 0, ms: Date.now() - started },
      error: err instanceof Error ? err.message : String(err),
    };
  }
  rows.set(c.id, row);
  const failed = row.markets.flatMap((m) => m.expectations).filter((e) => !e.pass).length;
  console.log(
    row.error
      ? `ERROR ${row.error}`
      : `${Math.round(row.stats.ms / 1000)} s, ${row.markets.flatMap((m) => m.transcreate.swaps).length} swaps, ${failed} failed checks`,
  );
  const ordered = CASES.flatMap((x) => (rows.has(x.id) ? [rows.get(x.id)!] : []));
  writeFileSync(FILE, JSON.stringify({ ranAt: new Date().toISOString(), cases: ordered }, null, 2));
}
