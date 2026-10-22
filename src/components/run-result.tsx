"use client";

import { briefConstants, buildDecisions, summarizeRun, type RunSummary } from "@/lib/crashtest/explain";
import { STOP_LABEL, type RunState } from "@/lib/crashtest/types";
import { AuditDetails, DecisionReview } from "./plan-comparison";

const EARLY = new Set(["user_cancelled", "error", "api_budget_limit", "insufficient_data"]);
const eyebrow = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted";

/** Outcome first: the real delta in words, then the three stages' counts. */
export function RunResultHeader({ state, summary, recorded }: { state: RunState; summary: RunSummary; recorded?: boolean }) {
  const n = summary.total;
  const stages: [string, string, string][] = [
    ["Your brief", `${summary.userSpecified} of ${n}`, "choices specified"],
    ["LLM completion", `${summary.baselineSupported} of ${n}`, `supported · ${summary.baselineContradicted} contradicted`],
    ["Qloo-tested agent", `${summary.revisedSupported} of ${n}`, `supported · ${summary.revisedContradicted} contradicted`],
  ];
  return (
    <header>
      <p className={eyebrow}>
        {state.marketLabel} · {recorded ? "Recorded run" : "Live run"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-ink">{summary.headline}</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-2">{summary.detail}</p>
      <dl className="mt-5 grid border-y border-line sm:grid-cols-3">
        {stages.map(([k, v, s], i) => (
          <div key={k} className={`py-3 sm:px-4 ${i ? "border-t border-line sm:border-l sm:border-t-0" : "sm:pl-0"}`}>
            <dt className={eyebrow}>{k}</dt>
            <dd className="mt-1 text-sm text-ink-2">
              <span className="text-lg font-semibold text-ink">{v}</span> {s}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/** The user context every stage shares, shown once rather than as plan choices. */
export function BriefConstants({ state }: { state: RunState }) {
  return (
    <section aria-label="Brief held constant" className="text-xs leading-5 text-ink-2">
      <p className={eyebrow}>Brief held constant</p>
      <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
        {briefConstants(state).map((c) => (
          <div key={c.label} className="flex min-w-0 gap-1.5">
            <dt className="text-muted">{c.label}</dt>
            <dd className="min-w-0 break-words text-ink">{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RunResult({ state, recorded }: { state: RunState; recorded?: boolean }) {
  const summary = summarizeRun(state);
  if (!summary)
    return (
      <p className="text-[15px] text-ink-2">
        The run stopped before any choice could be tested{state.stopDetail ? `: ${state.stopDetail}` : "."}
      </p>
    );
  const decisions = buildDecisions(state);
  const ledger = new Map(state.evidenceLedger.map((r) => [r.evidenceId, r]));
  return (
    <div className="space-y-7 pt-3">
      {state.stopReason && EARLY.has(state.stopReason) && (
        <p className="text-sm text-weak">
          Stopped early: {STOP_LABEL[state.stopReason]}
          {state.stopDetail ? ` (${state.stopDetail})` : ""}. Showing what was tested so far.
        </p>
      )}
      <RunResultHeader state={state} summary={summary} recorded={recorded} />
      <BriefConstants state={state} />
      <DecisionReview state={state} decisions={decisions} ledger={ledger} />
      <AuditDetails state={state} />
    </div>
  );
}
