/**
 * Build docs/EVALUATION.md from eval/out/results.json.
 *
 *   npm run live eval/report.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { SLOT_LABEL, STOP_LABEL, type Slot, type StopReason } from "../src/lib/crashtest/types";
import { CASES } from "./cases";
import type { CaseRow, Scored } from "./run";

const { ranAt, cases } = JSON.parse(readFileSync("eval/out/results.json", "utf8")) as { ranAt: string; cases: CaseRow[] };
const ok = cases.filter((c) => c.inRun);
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "–" : String(Math.round(x * 100)));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function aggregate(rows: CaseRow[], pick: (c: CaseRow) => { draft: Scored; final: Scored } | null) {
  const pairs = rows.map(pick).filter((p): p is { draft: Scored; final: Scored } => p !== null);
  return {
    n: pairs.length,
    slots: pairs.length * 4,
    draftSupported: sum(pairs.map((p) => p.draft.supported)),
    finalSupported: sum(pairs.map((p) => p.final.supported)),
    draftTotal: mean(pairs.flatMap((p) => (p.draft.total === null ? [] : [p.draft.total]))),
    finalTotal: mean(pairs.flatMap((p) => (p.final.total === null ? [] : [p.final.total]))),
    better: pairs.filter((p) => p.final.supported > p.draft.supported).length,
    worse: pairs.filter((p) => p.final.supported < p.draft.supported).length,
  };
}

function judgeTally(rows: CaseRow[]) {
  const j = rows.flatMap((r) => (r.judge ? [r.judge] : []));
  return {
    n: j.length,
    agent: j.filter((v) => v.preferred === "agent").length,
    draft: j.filter((v) => v.preferred === "draft").length,
    tie: j.filter((v) => v.preferred === "tie").length,
    consistent: j.filter((v) => v.consistent).length,
    dims: (["localFit", "specificity", "coherence", "constraints"] as const).map((k) => ({
      k,
      agent: mean(j.map((v) => v.agent[k])),
      draft: mean(j.map((v) => v.draft[k])),
    })),
  };
}

const f1 = (x: number | null) => (x === null ? "–" : x.toFixed(1));
const out: string[] = [];
out.push(
  "# Evaluation",
  "",
  `**Run:** ${ranAt.slice(0, 10)} · **Briefs:** ${cases.length} (${cases.filter((c) => c.split === "dev").length} dev, ${cases.filter((c) => c.split === "heldout").length} held out) across ${new Set(cases.map((c) => c.city)).size} cities · **Mode:** live Qloo and model calls, thorough depth (≤ 3 repair rounds, ≤ 700 Qloo calls)`,
  "",
  "Reproduce with `npm run live eval/run.ts`, then `npm run live eval/report.ts`. Raw outputs stay in the git-ignored `eval/out/` (they contain Qloo-derived data). The briefs are in [`eval/cases.ts`](../eval/cases.ts). Launching brands are fictional; audience anchors are real.",
  "",
  "## What is compared",
  "",
  "| Condition | What it is |",
  "|---|---|",
  "| **LLM-only draft** | The model's first plan from the brief alone, with no Qloo data. It is the agent's own first step, so both conditions share the same model, brief and constraints. |",
  "| **Agent** | The plan after the crash-test loop: resolve in Qloo, test every choice, repair the weakest, re-test, stop on acceptance, stall or budget. |",
  "",
  "Three measurements, from least to most independent:",
  "",
  "1. **In-run scores.** Both plans as the agent's evaluator scored them during the run. The agent optimises exactly this, so a gain here shows the loop does what it claims. It does **not** show the plan is better.",
  "2. **Held-out anchors.** Both plans re-scored by the same rubric, but with a *different* set of brands or artists standing for the same audience (for example Patta, A-Cold-Wall and Skepta instead of Stüssy, Palace and Carhartt). The agent never saw these anchors, so a gain here means the improvement carries beyond the exact signal it optimised.",
  "3. **Blind judge.** A model judge compares the two plans as A/B, in both orders. A preference counts only when both orders agree; otherwise it's a tie. The judge is the same model family that wrote the draft, so any self-preference bias favours the draft.",
  "",
);

const inRun = aggregate(ok, (c) => c.inRun);
const held = aggregate(ok, (c) => c.heldOut);
out.push(
  "## Results",
  "",
  "| Measure | LLM-only draft | Agent |",
  "|---|---|---|",
  `| Supported choices, in-run (${inRun.n} briefs, ${inRun.slots} choices) | ${inRun.draftSupported} | ${inRun.finalSupported} |`,
  `| Mean plan score, in-run (app-defined, 0–100) | ${pct(inRun.draftTotal)} | ${pct(inRun.finalTotal)} |`,
  `| **Supported choices, held-out anchors** (${held.n} briefs, ${held.slots} choices) | **${held.draftSupported}** | **${held.finalSupported}** |`,
  `| Mean plan score, held-out anchors | ${pct(held.draftTotal)} | ${pct(held.finalTotal)} |`,
  `| Briefs where held-out support rose / fell | – | ${held.better} / ${held.worse} |`,
  `| Draft choices not found in Qloo at all | ${sum(ok.map((c) => c.draftUnresolved.length))} of ${ok.length * 4} | – |`,
  "",
);
const j = judgeTally(ok);
out.push(
  "### Blind judge",
  "",
  `${j.n} pairs. Prefers the agent's plan in **${j.agent}**, the draft in **${j.draft}**, tie in **${j.tie}**. The two orders agreed on ${j.consistent} of ${j.n}.`,
  "",
  "| Mean rating (1–5, both orders) | Draft | Agent |",
  "|---|---|---|",
  ...j.dims.map((d) => `| ${d.k} | ${f1(d.draft)} | ${f1(d.agent)} |`),
  "",
);

const heldSplit = aggregate(ok.filter((c) => c.split === "heldout"), (c) => c.heldOut);
const jh = judgeTally(ok.filter((c) => c.split === "heldout"));
out.push(
  "### Held-out briefs only",
  "",
  `${heldSplit.n} briefs never used for tuning: supported choices with held-out anchors ${heldSplit.draftSupported} → ${heldSplit.finalSupported} of ${heldSplit.slots}; judge agent ${jh.agent} / draft ${jh.draft} / tie ${jh.tie}.`,
  "",
);

out.push("## Per brief", "", "| Brief | City | Split | Changes | In-run supported | Held-out supported | Judge | Stopped |", "|---|---|---|---|---|---|---|---|");
for (const c of cases) {
  const changes = c.run.changes.filter((x) => !x.reverted);
  out.push(
    `| ${c.id} | ${c.city} | ${c.split} | ${changes.map((x) => `${x.before} → ${x.after}`).join("; ") || "none"} | ${c.inRun ? `${c.inRun.draft.supported} → ${c.inRun.final.supported}` : "–"} | ${c.heldOut ? `${c.heldOut.draft.supported} → ${c.heldOut.final.supported}` : "–"} | ${c.judge?.preferred ?? "–"} | ${c.run.stopReason ? STOP_LABEL[c.run.stopReason as StopReason] : "–"} |`,
  );
}
out.push("");

out.push("## Plans", "");
for (const c of cases) {
  const k = CASES.find((x) => x.id === c.id);
  out.push(`### ${c.id} (${c.city})`, "");
  out.push(`Audience: ${k?.brief.audienceDescription}. Run anchors: ${k?.brief.audienceAnchors?.join(", ")}. Held-out anchors: ${c.heldOut?.anchors.join(", ") ?? "–"}.`, "");
  out.push("| Choice | Draft | Agent | Held-out status (draft → agent) |", "|---|---|---|---|");
  for (let i = 0; i < c.draft.length; i++) {
    const cut = (s: string) => [s.slice(0, s.indexOf(": ")), s.slice(s.indexOf(": ") + 2)];
    const [slot, d] = cut(c.draft[i]);
    const a = c.final[i] ? cut(c.final[i])[1] : "";
    const hs = c.heldOut ? `${c.heldOut.draft.statuses[slot]} → ${c.heldOut.final.statuses[slot]}` : "–";
    out.push(`| ${SLOT_LABEL[slot as Slot] ?? slot} | ${d} | ${a === d ? "(same)" : a} | ${hs.replaceAll("_", " ")} |`);
  }
  if (c.judge) out.push("", `Judge: _${c.judge.reason}_`);
  if (c.error) out.push("", `Note: ${c.error}`);
  out.push("");
}

const ms = ok.map((c) => c.run.ms);
out.push(
  "## Cost",
  "",
  `Mean ${Math.round((mean(ms) ?? 0) / 1000)} s per brief, ${Math.round(mean(ok.map((c) => c.run.qlooCallsUsed)) ?? 0)} Qloo calls (counted before the cache), ${f1(mean(ok.map((c) => c.run.llmCalls)))} model calls. Repair rounds used: ${ok.map((c) => c.run.currentIteration).join(", ")}.`,
  "",
  "## Limits of this evaluation",
  "",
  `- ${cases.length} briefs is a small sample. No significance is claimed.`,
  "- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.",
  "- The judge is a model, not people from these cities. No human review was run.",
  "- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.",
  "",
);
writeFileSync("docs/EVALUATION.md", out.join("\n"));
console.log("wrote docs/EVALUATION.md");
