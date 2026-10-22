"use client";

import type { DecisionExplanation } from "@/lib/crashtest/explain";
import { toMarkdown } from "@/lib/crashtest/report";
import { SLOT_LABEL, STATUS_LABEL, STOP_LABEL, type RunState } from "@/lib/crashtest/types";

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.11em] text-muted";

function StageValue({ value, note, status, strong = false }: { value: string; note: string; status?: string; strong?: boolean }) {
  return (
    <div>
      <p className={`text-[15px] leading-5 ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-xs leading-4 text-muted">
        {note}
        {status ? ` · ${status}` : ""}
      </p>
    </div>
  );
}

/** One human paragraph that explains the full user → LLM → agent decision. */
export function decisionNarrative(d: DecisionExplanation): string {
  const opening = d.userChoice
    ? `You chose ${d.userChoice.label}${d.userChoice.locked ? " and marked it as fixed" : ""}. The LLM carried that choice into its draft.`
    : `You left this open, so the LLM proposed ${d.baseline.label}.`;

  if (!d.changed) return `${opening} The agent kept ${d.revised.label}. ${d.whyStayed.join(" ")}`;

  const originalFinding = d.whyAway[0] ?? d.summaryReason;
  const permission = d.userChoice && !d.userChoice.locked ? " Because it was not fixed, the agent was allowed to test alternatives." : "";
  return `${opening} ${originalFinding}${permission} The agent chose ${d.revised.label} instead. ${d.whyToward.join(" ")}`;
}

function DecisionRows({ d }: { d: DecisionExplanation }) {
  return (
    <tbody className="border-t border-line first:border-t-0">
      <tr className="align-top">
        <th scope="row" className="w-[13%] px-4 py-5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
          {SLOT_LABEL[d.slot]}
        </th>
        <td className="w-[27%] px-4 py-5">
          {d.userChoice ? (
            <StageValue value={d.userChoice.label} note={d.userChoice.locked ? "Your choice · fixed" : "Your choice"} />
          ) : (
            <StageValue value="Not specified" note="You left this open" />
          )}
        </td>
        <td className="w-[30%] px-4 py-5">
          <StageValue value={d.baseline.label} note={d.baseline.origin === "user_provided" ? "Carried forward from you" : "Added by the LLM"} status={STATUS_LABEL[d.baseline.status]} />
        </td>
        <td className="w-[30%] px-4 py-5">
          <StageValue value={d.revised.label} note={d.changed ? "Changed by the agent" : "Kept by the agent"} status={STATUS_LABEL[d.revised.status]} strong />
        </td>
      </tr>
      <tr className="bg-panel-2/55 align-top">
        <th scope="row" className="px-4 py-4 text-left font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
          Why
        </th>
        <td colSpan={3} className="px-4 py-4">
          <p className="max-w-4xl text-[14px] leading-6 text-ink-2">{decisionNarrative(d)}</p>
          {d.limitations.length > 1 && <p className="mt-2 text-xs leading-5 text-muted">Note: {d.limitations.slice(0, -1).join(" ")}</p>}
        </td>
      </tr>
    </tbody>
  );
}

/** The complete comparison. Reasons are visible by default; there are no tabs or review drawers. */
export function ComparisonTable({ decisions }: { decisions: DecisionExplanation[] }) {
  return (
    <section aria-labelledby="comparison-title">
      <div className="mb-4">
        <p className={eyebrow}>Plan comparison</p>
        <h3 id="comparison-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-ink">
          Your direction, the LLM draft and the agent&apos;s recommendation
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-2">
          Each choice is shown side by side. The row beneath it explains, in plain language, why the agent kept it or changed it.
        </p>
      </div>
      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full min-w-[780px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-[#eeede8] text-left">
              <th className={`px-4 py-3 ${eyebrow}`}>Choice</th>
              <th className={`px-4 py-3 ${eyebrow}`}>You</th>
              <th className={`px-4 py-3 ${eyebrow}`}>LLM</th>
              <th className={`px-4 py-3 ${eyebrow}`}>Agent</th>
            </tr>
          </thead>
          {decisions.map((d) => <DecisionRows key={d.slot} d={d} />)}
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        “Supported” means supported by the recorded cultural evidence in this test. It is not a prediction of commercial success.
      </p>
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
        <dt className="text-muted">Qloo calls</dt>
        <dd>{state.qlooCallsUsed} of {state.maxQlooCalls}</dd>
        <dt className="text-muted">Model calls</dt>
        <dd>{state.llmCalls}</dd>
        <dt className="text-muted">Rubric</dt>
        <dd>{last?.rubricVersion ?? "–"} (application-defined; not a forecast)</dd>
      </dl>
      <button type="button" onClick={download} className="mt-3 text-xs text-accent hover:underline">Download report</button>
    </details>
  );
}
