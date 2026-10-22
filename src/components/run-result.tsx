"use client";

import { briefConstants, buildDecisions, summarizeRun, type RunSummary } from "@/lib/crashtest/explain";
import { STOP_LABEL, type RunState } from "@/lib/crashtest/types";
import { AuditDetails, ComparisonTable } from "./plan-comparison";

const EARLY = new Set(["user_cancelled", "error", "api_budget_limit", "insufficient_data"]);
const eyebrow = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted";

/** A plain introduction to the three-way comparison. */
export function RunResultHeader({ state, summary, recorded }: { state: RunState; summary: RunSummary; recorded?: boolean }) {
  return (
    <header>
      <p className={eyebrow}>
        {state.marketLabel} · {recorded ? "Recorded run" : "Live run"}
      </p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-[-0.035em] text-ink">Here&apos;s how the three plans compare.</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-2">
        You specified {summary.userSpecified} of {summary.total} choices. The LLM completed the rest without Qloo. After testing the plan, the agent changed {summary.changed} and kept {summary.retained}.
      </p>
      <p className="mt-3 text-sm text-muted">
        LLM draft: {summary.baselineSupported}/{summary.total} supported &nbsp;→&nbsp; Agent plan: {summary.revisedSupported}/{summary.total} supported
      </p>
    </header>
  );
}

/** The user context every stage shares, shown once rather than as plan choices. */
export function BriefConstants({ state }: { state: RunState }) {
  const constants = briefConstants(state);
  return (
    <section aria-label="Your direction" className="border-l-2 border-ink/20 pl-4 text-sm leading-6 text-ink-2">
      <p className={eyebrow}>Your direction</p>
      <p className="mt-1">
        {constants.map((c, i) => (
          <span key={c.label}>
            {i ? " · " : ""}<span className="text-muted">{c.label}:</span> <span className="text-ink">{c.value}</span>
          </span>
        ))}
      </p>
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
      <ComparisonTable decisions={decisions} />
      <AuditDetails state={state} />
    </div>
  );
}
