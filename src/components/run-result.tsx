"use client";

import { useState } from "react";
import { buildChangeExplanations, type ComponentChangeExplanation } from "@/lib/crashtest/explain";
import { SLOT_LABEL, STOP_LABEL, type ComponentAssessment, type RunState } from "@/lib/crashtest/types";
import { PlanComparisonView } from "./plan-comparison";
import { StatusBadge } from "./status";

/** A compact plan card. The agent's card marks each choice Changed (→) or Kept (=). */
export function PlanTable({
  title,
  sub,
  rows,
  accent,
  changes,
}: {
  title: string;
  sub: string;
  rows: ComponentAssessment[];
  accent?: boolean;
  changes?: ComponentChangeExplanation[];
}) {
  const supported = rows.filter((r) => r.status === "supported").length;
  return (
    <div className={`overflow-hidden rounded-xl border ${accent ? "border-accent" : "border-line"} bg-panel`}>
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <div>
          <p className={`text-sm font-medium ${accent ? "text-accent" : "text-ink"}`}>{title}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <p className="text-xs text-muted">
          {supported} of {rows.length} supported
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => {
            const ch = changes?.find((c) => c.slot === r.slot);
            return (
              <tr key={r.slot} className="border-b border-line last:border-0">
                <th scope="row" className="w-24 px-4 py-2.5 text-left align-top text-xs font-normal text-muted">
                  {SLOT_LABEL[r.slot]}
                </th>
                <td className="px-2 py-2.5 align-top text-ink">
                  {r.label}
                  {ch && (
                    <span className={`ml-2 whitespace-nowrap text-[11px] ${ch.changed ? "text-accent" : "text-muted"}`}>
                      {ch.changed ? "→ Changed" : "= Kept"}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap py-2.5 pl-2 pr-4 text-right align-top">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const EARLY = new Set(["user_cancelled", "error", "api_budget_limit", "insufficient_data"]);

export function RunResult({ state }: { state: RunState }) {
  const [open, setOpen] = useState(false);
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!first || !last)
    return (
      <p className="text-[15px] text-ink-2">
        The run stopped before any choice could be tested{state.stopDetail ? `: ${state.stopDetail}` : "."}
      </p>
    );
  const explanations = buildChangeExplanations(state);
  const n = explanations.filter((e) => e.changed).length;
  return (
    <div className="space-y-4">
      {state.stopReason && EARLY.has(state.stopReason) && (
        <p className="text-sm text-weak">
          Stopped early: {STOP_LABEL[state.stopReason]}
          {state.stopDetail ? ` (${state.stopDetail})` : ""}. Showing what was tested so far.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <PlanTable title="LLM alone" sub="No data, its own picks" rows={first.components} />
        <PlanTable title="Qloo-grounded agent" sub={`Tested against Qloo in ${state.marketLabel}`} rows={last.components} accent changes={explanations} />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="compare-plans"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg shadow-sm hover:brightness-110"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {open ? "Hide comparison" : `Compare plans & see why · ${n} change${n === 1 ? "" : "s"}`}
        </button>
        {!open && (
          <p className="mt-2 text-xs text-muted">See why the agent kept or changed each choice, with the Qloo evidence behind it.</p>
        )}
      </div>

      {open && <PlanComparisonView state={state} explanations={explanations} />}
    </div>
  );
}
