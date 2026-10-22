"use client";

import type { DecisionExplanation } from "@/lib/crashtest/explain";
import { toMarkdown } from "@/lib/crashtest/report";
import { SLOT_LABEL, STATUS_LABEL, STOP_LABEL, type RunState, type Slot } from "@/lib/crashtest/types";

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.11em] text-muted";

function StageValue({ value, note, status }: { value: string; note: string; status?: string }) {
  return (
    <div>
      <p className="text-[15px] font-semibold leading-5 text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium leading-4 text-muted">
        {note}
        {status ? ` · ${status}` : ""}
      </p>
    </div>
  );
}

/**
 * The Why paragraph, from recorded facts only, in order. Changed: the original and who supplied
 * it, what the test returned, the alternative, the evidence for it, the full-plan re-test.
 * Retained: the choice and who supplied it, then the evidence or rule that kept it.
 */
export function decisionSentences(d: DecisionExplanation): string[] {
  const opening = d.userChoice
    ? `You chose ${d.userChoice.label}${d.userChoice.locked ? " and fixed it" : ""}.`
    : `The LLM proposed ${d.baseline.label}.`;
  if (!d.changed) return [opening, ...d.whyStayed];
  return [opening, d.whyAway[0] ?? d.summaryReason, `The agent chose ${d.revised.label}.`, ...d.whyToward];
}

export function decisionNarrative(d: DecisionExplanation): string {
  return decisionSentences(d).join(" ");
}

function DecisionRows({ d, focused, onEvidencePath }: { d: DecisionExplanation; focused: boolean; onEvidencePath?: (slot: Slot) => void }) {
  return (
    <tbody className="border-t-2 border-line first:border-t-0" data-focused={focused || undefined}>
      <tr className="align-top">
        <th scope="row" className={`w-[16%] border-r border-line px-4 py-5 text-left text-xs font-bold uppercase tracking-[0.06em] text-ink ${focused ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "bg-panel-2/30"}`}>
          {SLOT_LABEL[d.slot]}
        </th>
        <td className="w-[28%] px-5 py-5">
          {d.userChoice ? (
            <StageValue value={d.userChoice.label} note={d.userChoice.locked ? "Your choice · fixed" : "Your choice"} />
          ) : (
            <StageValue value="Not specified" note="You left this open" />
          )}
        </td>
        <td className="w-[28%] border-l border-line px-5 py-5">
          <StageValue value={d.baseline.label} note={d.baseline.origin === "user_provided" ? "Carried forward from you" : "Added by the LLM"} status={STATUS_LABEL[d.baseline.status]} />
        </td>
        <td className="w-[28%] border-l border-line px-5 py-5">
          <StageValue value={d.revised.label} note={d.changed ? "Changed by the agent" : "Kept by the agent"} status={STATUS_LABEL[d.revised.status]} />
        </td>
      </tr>
      <tr className="bg-panel-2/55 align-top">
        <th scope="row" className="border-r border-line px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.06em] text-ink">
          Why
        </th>
        <td colSpan={3} className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
            <p className="max-w-4xl text-[14px] leading-6 text-ink-2">{decisionNarrative(d)}</p>
            {onEvidencePath && (
              <button
                type="button"
                onClick={() => onEvidencePath(d.slot)}
                className="-my-2 min-h-11 shrink-0 px-1 text-xs font-medium text-accent hover:underline focus-visible:underline"
              >
                Decision trace →
              </button>
            )}
          </div>
        </td>
      </tr>
    </tbody>
  );
}

/** The complete comparison. Reasons are visible by default; there are no tabs or review drawers. */
export function ComparisonTable({
  decisions,
  focus = null,
  onEvidencePath,
}: {
  decisions: DecisionExplanation[];
  /** The choice selected in either view. */
  focus?: Slot | null;
  /** Opens the decision graph on this choice. */
  onEvidencePath?: (slot: Slot) => void;
}) {
  return (
    <section aria-labelledby="comparison-title">
      <div className="mb-4">
        <p className={eyebrow}>Plan comparison</p>
        <h3 id="comparison-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-ink">
          Your direction, the LLM draft and the agent&apos;s recommendation
        </h3>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-panel shadow-sm">
        <table className="w-full min-w-[780px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-[#e9e7e1] text-left">
              <th className="border-r border-line px-4 py-3.5 text-xs font-bold uppercase tracking-[0.08em] text-ink">Choice</th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.08em] text-ink">You</th>
              <th className="border-l border-line px-5 py-3.5 text-xs font-bold uppercase tracking-[0.08em] text-ink">LLM</th>
              <th className="border-l border-line px-5 py-3.5 text-xs font-bold uppercase tracking-[0.08em] text-ink">Agent</th>
            </tr>
          </thead>
          {decisions.map((d) => <DecisionRows key={d.slot} d={d} focused={focus === d.slot} onEvidencePath={onEvidencePath} />)}
        </table>
      </div>
    </section>
  );
}

/** Methodology, budgets and the report remain available without competing with the comparison. */
export function AuditDetails({ state }: { state: RunState }) {
  const last = state.evaluations.at(-1);
  const download = () => {
    const url = URL.createObjectURL(new Blob([toMarkdown(state)], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `crash-test-${state.marketLabel.toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <details className="border-t border-line pt-3">
      <summary className="cursor-pointer text-xs text-muted">Method and run details</summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-ink-2">
        <li>The LLM completed the choices you left open, without using Qloo.</li>
        <li>The completed plan was tested against Qloo for the selected audience and market.</li>
        <li>Fixed choices stayed fixed. Other choices were changed only when the recorded test justified it.</li>
        <li>Every replacement was tested again as part of the complete plan.</li>
      </ol>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-ink-2">
        <dt className="text-muted">Stopped</dt>
        <dd>{state.stopReason ? STOP_LABEL[state.stopReason] : "–"}{state.stopDetail ? ` (${state.stopDetail})` : ""}</dd>
        <dt className="text-muted">Repair rounds</dt>
        <dd>{state.currentIteration} of {state.maxIterations}</dd>
        <dt className="text-muted">Qloo budget used</dt>
        <dd>{state.qlooCallsUsed} of {state.maxQlooCalls}</dd>
        {state.qlooUsage && (
          <>
            <dt className="text-muted">Qloo checks</dt>
            <dd>{state.qlooUsage.checks}</dd>
            <dt className="text-muted">Reused within the run</dt>
            <dd>{state.qlooUsage.reused}</dd>
            {state.qlooUsage.cacheHits !== undefined && (
              <>
                <dt className="text-muted">Served from cache</dt>
                <dd>{state.qlooUsage.cacheHits}</dd>
              </>
            )}
            {state.qlooUsage.requests !== undefined && (
              <>
                <dt className="text-muted">Requests sent to Qloo</dt>
                <dd>{state.qlooUsage.requests}</dd>
              </>
            )}
          </>
        )}
        <dt className="text-muted">Model calls</dt>
        <dd>{state.llmCalls}</dd>
        <dt className="text-muted">Rubric</dt>
        <dd>{last?.rubricVersion ?? "–"} (application-defined; not a forecast)</dd>
      </dl>
      <button type="button" onClick={download} className="mt-3 text-xs text-accent hover:underline">Download report</button>
    </details>
  );
}
