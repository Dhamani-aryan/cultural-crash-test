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

/** Where a sentence's claim comes from, shown inline so evidence and judgment stay apart. */
export type ProvenanceTag = "Qloo audience result" | "Qloo local result" | "Qloo lookup" | "User constraint" | "Full-plan re-test";
export interface NarrativeSegment {
  text: string;
  tag?: ProvenanceTag;
}

const awayTag = (d: DecisionExplanation): ProvenanceTag | undefined => {
  const code = d.reasonCodes[0];
  if (code === "audience_contradiction" || code === "audience_affinity" || code === "weak_coverage") return "Qloo audience result";
  if (code === "local_relevance") return "Qloo local result";
  if (code === "qloo_unknown") return "Qloo lookup";
  if (code === "constraint_conflict") return "User constraint";
};

const stayedTag = (d: DecisionExplanation, i: number): ProvenanceTag | undefined => {
  const code = d.reasonCodes[0];
  if (i === 0) {
    if (code === "constraint_locked") return "User constraint";
    if (code === "already_supported") return "Qloo audience result";
    if (code === "qloo_unknown" || code === "user_rule_unverified") return "Qloo lookup";
  }
  if (code === "no_better_alternative" && i === 1) return "Full-plan re-test";
};

/** The user → LLM → agent decision as sentences, each tagged with where its claim comes from. */
export function narrativeSegments(d: DecisionExplanation): NarrativeSegment[] {
  const opening: NarrativeSegment = {
    text: d.userChoice
      ? `You chose ${d.userChoice.label}${d.userChoice.locked ? " and marked it as fixed" : ""}. The LLM carried that choice into its draft.`
      : `You left this open, so the LLM proposed ${d.baseline.label}.`,
  };
  if (!d.changed) return [opening, { text: `The agent kept ${d.revised.label}.` }, ...d.whyStayed.map((text, i) => ({ text, tag: stayedTag(d, i) }))];
  const out: NarrativeSegment[] = [opening, { text: d.whyAway[0] ?? d.summaryReason, tag: awayTag(d) }];
  if (d.userChoice && !d.userChoice.locked) out.push({ text: "Because it was not fixed, the agent was allowed to test alternatives." });
  out.push({ text: `The agent chose ${d.revised.label} instead.` });
  const [toward, retest] = d.whyToward;
  if (toward) out.push({ text: toward, tag: "Qloo audience result" });
  if (retest) out.push({ text: retest, tag: "Full-plan re-test" });
  return out;
}

/** One human paragraph that explains the full user → LLM → agent decision. */
export function decisionNarrative(d: DecisionExplanation): string {
  return narrativeSegments(d)
    .map((s) => s.text)
    .join(" ");
}

function Tag({ children }: { children: string }) {
  return (
    <span className="mr-1.5 inline-block rounded-[3px] border border-line bg-panel px-1 py-px align-[1px] font-mono text-[9.5px] font-medium uppercase tracking-[0.06em] text-muted">
      {children}
    </span>
  );
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
          <p className="max-w-4xl text-[14px] leading-6 text-ink-2">
            {narrativeSegments(d).map((s, i) => (
              <span key={i}>
                {i ? " " : ""}
                {s.tag && <Tag>{s.tag}</Tag>}
                {s.text}
              </span>
            ))}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            {d.limitations.length > 1 ? <p className="text-xs leading-5 text-muted">Note: {d.limitations.slice(0, -1).join(" ")}</p> : <span />}
            {onEvidencePath && (
              <button
                type="button"
                onClick={() => onEvidencePath(d.slot)}
                className="-my-2 min-h-11 shrink-0 px-1 text-xs font-medium text-accent hover:underline focus-visible:underline"
              >
                Evidence path →
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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-2">
          Each choice is shown side by side. The row beneath it explains, in plain language, why the agent kept it or changed it.
        </p>
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
