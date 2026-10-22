import type { CaseRow } from "./run";

/**
 * Exact counts for one evaluation run: no percentages of nine, no significance claims. Shared by
 * the report and by the A/B comparison, so both say the same thing.
 */
export interface RunSummary {
  briefs: number;
  /** Briefs with held-out scores, and the choices those cover. */
  scored: number;
  slots: number;
  heldOutDraft: number;
  heldOutFinal: number;
  improved: number;
  unchanged: number;
  worsened: number;
  /** Evidence judge, both orders: a preference counts only when both orders agree. */
  evidence: { agent: number; tie: number; draft: number; judged: number; consistent: number };
  /** Diagnostic only: the no-evidence judge. */
  blind: { agent: number; tie: number; draft: number };
  /** Null when a run predates these counts: "not measured", never zero. */
  violations: number | null;
  unknownUserChoicesChanged: number | null;
  accepted: number;
  rejected: number;
  abstained: number | null;
  qlooChecks: number;
  qlooRequests: number | null;
  qlooCacheHits: number | null;
  llmCalls: number;
  inputTokens: number | null;
  outputTokens: number | null;
  medianMs: number;
  slowestMs: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sumOrNull = (xs: (number | null | undefined)[]) => (xs.some((x) => x === null || x === undefined) ? null : sum(xs as number[]));
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function summarize(rows: CaseRow[]): RunSummary {
  const ok = rows.filter((r) => r.inRun);
  const held = rows.flatMap((r) => (r.heldOut ? [r.heldOut] : []));
  const ev = rows.flatMap((r) => (r.evidenceJudge ? [r.evidenceJudge] : []));
  const bl = rows.flatMap((r) => (r.judge ? [r.judge] : []));
  const m = ok.map((r) => r.run.metrics);
  const metric = <K extends keyof NonNullable<(typeof m)[number]>>(k: K) => m.map((x) => (x ? x[k] : null));
  return {
    briefs: rows.length,
    scored: held.length,
    slots: held.length * 4,
    heldOutDraft: sum(held.map((h) => h.draft.supported)),
    heldOutFinal: sum(held.map((h) => h.final.supported)),
    improved: held.filter((h) => h.final.supported > h.draft.supported).length,
    unchanged: held.filter((h) => h.final.supported === h.draft.supported).length,
    worsened: held.filter((h) => h.final.supported < h.draft.supported).length,
    evidence: {
      agent: ev.filter((v) => v.preferred === "agent").length,
      tie: ev.filter((v) => v.preferred === "tie").length,
      draft: ev.filter((v) => v.preferred === "draft").length,
      judged: ev.length,
      consistent: ev.filter((v) => v.consistent).length,
    },
    blind: {
      agent: bl.filter((v) => v.preferred === "agent").length,
      tie: bl.filter((v) => v.preferred === "tie").length,
      draft: bl.filter((v) => v.preferred === "draft").length,
    },
    violations: sumOrNull(metric("violations") as (number | null)[]),
    unknownUserChoicesChanged: sumOrNull(metric("unknownUserChoicesChanged") as (number | null)[]),
    accepted: sum(ok.map((r) => r.run.changes.filter((c) => !c.reverted).length)),
    rejected: sum(ok.map((r) => r.run.changes.filter((c) => c.reverted).length)),
    abstained: sumOrNull(metric("abstained") as (number | null)[]),
    qlooChecks: sum(ok.map((r) => r.run.metrics?.qlooChecks ?? r.run.qlooCallsUsed)),
    qlooRequests: sumOrNull(metric("qlooRequests") as (number | null)[]),
    qlooCacheHits: sumOrNull(metric("qlooCacheHits") as (number | null)[]),
    llmCalls: sum(ok.map((r) => r.run.llmCalls)),
    inputTokens: sumOrNull(ok.map((r) => r.run.usage?.inputTokens)),
    outputTokens: sumOrNull(ok.map((r) => r.run.usage?.outputTokens)),
    medianMs: median(ok.map((r) => r.run.ms)),
    slowestMs: Math.max(0, ...ok.map((r) => r.run.ms)),
  };
}

/** The summary as Markdown table rows: | Measure | value |. */
export function summaryRows(s: RunSummary): [string, string][] {
  const n = (x: number | null) => (x === null ? "not measured" : String(x));
  return [
    ["Held-out supported choices (draft → agent)", `${s.heldOutDraft} → ${s.heldOutFinal} of ${s.slots} (${s.scored} of ${s.briefs} briefs scored)`],
    ["Briefs improved / unchanged / worsened", `${s.improved} / ${s.unchanged} / ${s.worsened}`],
    ["Evidence judge, both orders (agent / tie / LLM)", `${s.evidence.agent} / ${s.evidence.tie} / ${s.evidence.draft} of ${s.evidence.judged} judged; ${s.evidence.consistent} consistent across orders`],
    ["Blind judge, diagnostic only (agent / tie / LLM)", `${s.blind.agent} / ${s.blind.tie} / ${s.blind.draft}`],
    ["Hard-constraint violations in final plans", n(s.violations)],
    ["Qloo-unknown user choices replaced", n(s.unknownUserChoicesChanged)],
    ["Candidates accepted / rejected after re-test", `${s.accepted} / ${s.rejected}`],
    ["Choices left for a human (open questions)", n(s.abstained)],
    ["Qloo checks / requests sent / cache hits", `${s.qlooChecks} / ${n(s.qlooRequests)} / ${n(s.qlooCacheHits)}`],
    ["Model calls (input / output tokens)", `${s.llmCalls} (${n(s.inputTokens)} / ${n(s.outputTokens)})`],
    ["Run time, median / slowest", `${Math.round(s.medianMs / 1000)} s / ${Math.round(s.slowestMs / 1000)} s`],
  ];
}

/** The merge gates for experiment B against current agent A. `pass: null` means the gate isn't active yet. */
export interface Gate {
  name: string;
  pass: boolean | null;
  detail: string;
}

export function gates(sa: RunSummary, sb: RunSummary, plaus: number | null, reviewedCases: number): Gate[] {
  const within = (x: number, base: number) => base === 0 || x <= base * 1.25;
  return [
    { name: "Zero hard-constraint violations", pass: sb.violations === null ? null : sb.violations === 0, detail: `B: ${sb.violations ?? "not measured"}` },
    {
      name: "Zero Qloo-unknown user choices replaced",
      pass: sb.unknownUserChoicesChanged === null ? null : sb.unknownUserChoicesChanged === 0,
      detail: `B: ${sb.unknownUserChoicesChanged ?? "not measured"}`,
    },
    { name: "No evidence-judge losses", pass: sb.evidence.draft === 0, detail: `B: ${sb.evidence.draft} loss(es)${sb.evidence.draft ? " (each needs a manual review to justify)" : ""}` },
    { name: "No reduction in total held-out support", pass: sb.heldOutFinal >= sa.heldOutFinal && sb.slots === sa.slots, detail: `A ${sa.heldOutFinal}/${sa.slots}, B ${sb.heldOutFinal}/${sb.slots}` },
    {
      name: "No reviewed plausibility case implausible",
      pass: reviewedCases === 0 ? null : plaus === null ? null : plaus === 0,
      detail: reviewedCases === 0 ? "no case has been human-reviewed yet: gate not yet active" : plaus === null ? "no graded plausibility run for B" : `B: ${plaus}`,
    },
    {
      name: "No material cost or latency regression (≤ 25% more)",
      pass: within(sb.qlooChecks, sa.qlooChecks) && within(sb.medianMs, sa.medianMs),
      detail: `Qloo checks A ${sa.qlooChecks}, B ${sb.qlooChecks}; median A ${Math.round(sa.medianMs / 1000)} s, B ${Math.round(sb.medianMs / 1000)} s`,
    },
  ];
}
