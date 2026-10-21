/**
 * Builds docs/EVALUATION.md from eval/out/results.json (written by eval/run.ts).
 *
 *   npm run live eval/report.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CASES } from "./cases";
import type { CaseRow, JudgeScores, MarketRow, PickRow } from "./run";

const { ranAt, cases } = JSON.parse(readFileSync("eval/out/results.json", "utf8")) as {
  ranAt: string;
  cases: CaseRow[];
};

const markets = cases.flatMap((c) => c.markets.map((m) => ({ c, m })));
const ours = markets.flatMap(({ m }) => m.transcreate.swaps);
const theirs = markets.flatMap(({ m }) => m.baseline?.swaps ?? []);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "–");
const count = (rows: PickRow[], f: (r: PickRow) => boolean) => rows.filter(f).length;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "–");

function pickTable(): string {
  const row = (label: string, f: (r: PickRow) => boolean) =>
    `| ${label} | ${count(ours, f)} / ${ours.length} (${pct(count(ours, f), ours.length)}) | ${count(theirs, f)} / ${theirs.length} (${pct(count(theirs, f), theirs.length)}) |`;
  const roles = (rows: PickRow[]) =>
    fmt(mean(rows.filter((r) => r.check.role !== null).map((r) => r.check.role!)));
  return [
    "| Check (same Qloo test for both) | Transcreate | Model alone |",
    "|---|---|---|",
    row("Found in Qloo at all", (r) => r.check.found),
    row("From the target country (origin, release or location)", (r) => r.check.fromHere),
    row("In the city's own taste list for its kind", (r) => r.check.localEvidence),
    row("Of foreign origin (another country's brand, artist or show)", (r) => r.check.foreign),
    row("Also in a US city's list (an American would know it too)", (r) => r.check.familiarInSource),
    row("Known everywhere (in 2+ other cities' lists, or a global superstar)", (r) => r.check.global),
    row("**Passes every locality check**", (r) => r.check.local),
    `| Mean role overlap with the original (tag Jaccard) | ${roles(ours)} | ${roles(theirs)} |`,
  ].join("\n");
}

function judgeTable(): string {
  const judged = markets.filter(({ m }) => m.judge);
  const avg = (side: "transcreate" | "baseline", k: keyof JudgeScores) =>
    fmt(mean(judged.map(({ m }) => m.judge![side][k])), 1);
  const prefs = { transcreate: 0, baseline: 0, tie: 0 };
  for (const { m } of judged) prefs[m.judge!.preferred]++;
  return [
    `Judged market outputs: ${judged.length}. Preferred: **Transcreate ${prefs.transcreate}**, model alone ${prefs.baseline}, tie ${prefs.tie}.`,
    "",
    "| Mean score (1–5) | Transcreate | Model alone |",
    "|---|---|---|",
    `| Recognisable to locals | ${avg("transcreate", "recognisable")} | ${avg("baseline", "recognisable")} |`,
    `| Same job as the original | ${avg("transcreate", "fit")} | ${avg("baseline", "fit")} |`,
    `| Reads naturally | ${avg("transcreate", "natural")} | ${avg("baseline", "natural")} |`,
  ].join("\n");
}

function bySplit(): string {
  const lines = ["| Split | Markets | Transcreate preferred | Model alone preferred | Tie |", "|---|---|---|---|---|"];
  for (const split of ["dev", "held_out"] as const) {
    const ms = markets.filter(({ c, m }) => c.split === split && m.judge);
    const n = (p: string) => ms.filter(({ m }) => m.judge!.preferred === p).length;
    lines.push(
      `| ${split === "dev" ? "Dev (tuned on)" : "Held out"} | ${ms.length} | ${n("transcreate")} | ${n("baseline")} | ${n("tie")} |`,
    );
  }
  return lines.join("\n");
}

function expectationsTable(): string {
  const all = markets.flatMap(({ c, m }) => m.expectations.map((e) => ({ c, m, e })));
  const failed = all.filter((x) => !x.e.pass);
  return [
    `**${all.length - failed.length} / ${all.length}** deterministic checks passed.`,
    "",
    failed.length
      ? [
          "| Case | Market | Check | Result |",
          "|---|---|---|---|",
          ...failed.map(({ c, m, e }) => `| ${c.label} | ${m.marketId} | ${e.name} | ${e.detail} |`),
        ].join("\n")
      : "No failures.",
  ].join("\n");
}

const swapList = (rows: PickRow[]) =>
  rows.length
    ? rows
        .map((s) => `${s.original} → ${s.pick}${s.check.local ? "" : !s.check.found ? " ✗not in Qloo" : " ✗"}`)
        .join("; ")
    : "—";

function perMarket(): string {
  const lines = [
    "| Case | Market | Transcreate | Model alone | Judge prefers |",
    "|---|---|---|---|---|",
  ];
  for (const { c, m } of markets) {
    const t = m.transcreate;
    const extra = [
      t.kept.length ? `kept ${t.kept.join(", ")}` : "",
      t.flagged.length ? `flagged ${t.flagged.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    lines.push(
      `| ${c.label}${c.split === "dev" ? " (dev)" : ""} | ${m.marketId} | ${swapList(t.swaps)}${extra ? ` (${extra})` : ""} | ${swapList(m.baseline?.swaps ?? [])} | ${m.judge?.preferred ?? "—"} |`,
    );
  }
  return lines.join("\n");
}

function technical(): string {
  const ok = cases.filter((c) => !c.error);
  const decisions = markets.flatMap(({ m }) => [
    ...m.transcreate.swaps.map(() => "swap"),
    ...m.transcreate.kept.map(() => "keep"),
    ...m.transcreate.flagged.map(() => "flag"),
  ]);
  const refs = cases.flatMap((c) => c.references);
  return [
    "| Metric | Result |",
    "|---|---|",
    `| Cases completed | ${ok.length} / ${cases.length} |`,
    `| Market outputs | ${markets.length} |`,
    `| References found in Qloo | ${refs.filter((r) => r.found).length} / ${refs.length} |`,
    `| Decisions: swap / keep / flag | ${decisions.filter((d) => d === "swap").length} / ${decisions.filter((d) => d === "keep").length} / ${decisions.filter((d) => d === "flag").length} |`,
    `| Agent searched another kind of culture | ${markets.reduce((n, { m }) => n + m.transcreate.triedDomain, 0)} times |`,
    `| Rewrites that needed the substitution fallback | ${markets.filter(({ m }) => m.transcreate.fallback).length} |`,
    `| Mean time per case (live, 2–3 markets + comparison) | ${Math.round(mean(ok.map((c) => c.stats.ms)) / 1000)} s |`,
    `| Mean Qloo calls per case | ${Math.round(mean(ok.map((c) => c.stats.qlooCalls)))} |`,
  ].join("\n");
}

function judgeNotes(): string {
  return markets
    .filter(({ m }) => m.judge)
    .map(
      ({ c, m }: { c: CaseRow; m: MarketRow }) =>
        `- **${c.label}, ${m.marketId}** (prefers ${m.judge!.preferred}): ${m.judge!.reason}`,
    )
    .join("\n");
}

const doc = `# Evaluation

**Run:** ${ranAt.slice(0, 10)} · **Cases:** ${cases.length} texts (${CASES.filter((c) => c.split === "dev").length} dev, ${CASES.filter((c) => c.split === "held_out").length} held out), ${markets.length} market outputs · **Mode:** live (Qloo + model, no saved results)

Reproduce with \`npm run live eval/run.ts\`, then \`npm run live eval/report.ts\`. Raw outputs stay in the git-ignored \`eval/out/\`. Every text was written for this project; the three dev cases are the demo texts the agent was tuned on, the rest were written afterwards and never used for tuning.

## What is compared

| Condition | What it is |
|---|---|
| **Transcreate** | The full agent: extract references, resolve them in Qloo, propose local candidates, search the city's taste data, gate and rank by role, locality, audience and fame, decide (swap, keep, flag or search another kind of culture), rewrite with a name guard. |
| **Model alone** | The same model, given the same text and cities, asked to localize it with no Qloo data (\`src/lib/agent/baseline.ts\`). |

Every pick from both sides then goes through **the same Qloo checks** (\`src/lib/agent/check.ts\`). They use the pick's own category lists, not the ones the engine searched, so Transcreate doesn't pass by construction.

## 1. Are the picks actually local?

${pickTable()}

## 2. Blind judge

A model judge, playing a resident of each city, sees the original and both rewrites as A and B, scores each and states a preference. Every pair is judged **twice with the order swapped**; a preference counts only when both orders agree, otherwise it is a tie, which cancels position bias. **Caveat:** the judge is the same model family as the "model alone" condition, so self-preference bias may remain. This is a check on readability and fit, not a substitute for native reviewers.

${judgeTable()}

${bySplit()}

## 3. Behaviour checks

Deterministic expectations: global functional references stay (iPhone, Google Calendar), invented names stay, a text with no references comes back unchanged, no film swaps where Qloo's film data for the city is too thin (London), every chosen name appears in the output, and no rewrite needed the fallback.

${expectationsTable()}

## 4. Technical

${technical()}

## Per market

✗ marks a pick that fails at least one locality check; "not in Qloo" means Qloo has no entity by that name.

${perMarket()}

## Judge's reasons

${judgeNotes()}

## What this does not show

- That native readers prefer these rewrites. A review form for native speakers in each city is the next step.
- Quality in other cities: only the five launch markets are supported, by design.
- Stability: model steps (extraction, proposals, decisions) can vary between runs; the Qloo engine itself is deterministic.
`;

writeFileSync("docs/EVALUATION.md", doc);
console.log("Wrote docs/EVALUATION.md");
