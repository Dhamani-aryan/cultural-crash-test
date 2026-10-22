"use client";

import { useRef, useState } from "react";
import { buildChangeExplanations, type ComponentChangeExplanation } from "@/lib/crashtest/explain";
import { SLOT_LABEL, STOP_LABEL, type ComponentAssessment, type RunState } from "@/lib/crashtest/types";
import { PlanComparisonView } from "./plan-comparison";
import { StatusBadge } from "./status";

/** A compact plan column. The revision marks each choice Changed or Kept. */
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
    <section className={`border-t-2 ${accent ? "border-accent" : "border-ink"}`}>
      <div className="flex min-h-20 items-start justify-between gap-4 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{sub}</p>
          <h3 className={`mt-1 text-lg font-semibold tracking-[-0.025em] ${accent ? "text-accent" : "text-ink"}`}>{title}</h3>
        </div>
        <p className="text-right font-mono text-[10px] uppercase leading-4 tracking-[0.08em] text-muted">
          <span className="block text-base font-medium text-ink">{supported}/{rows.length}</span>
          supported
        </p>
      </div>
      <table className="w-full border-t border-line text-sm">
        <tbody>
          {rows.map((r) => {
            const ch = changes?.find((c) => c.slot === r.slot);
            return (
              <tr key={r.slot} className="border-b border-line">
                <th scope="row" className="w-24 py-3 pr-3 text-left align-top font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-muted">
                  {SLOT_LABEL[r.slot]}
                </th>
                <td className="py-3 pr-2 align-top font-medium text-ink">
                  {r.label}
                  {ch && (
                    <span className={`ml-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.09em] ${ch.changed ? "text-accent" : "text-muted"}`}>
                      {ch.changed ? "Changed" : "Kept"}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 pl-2 text-right align-top">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const EARLY = new Set(["user_cancelled", "error", "api_budget_limit", "insufficient_data"]);

export function RunResult({ state }: { state: RunState }) {
  const [open, setOpen] = useState(false);
  const review = useRef<HTMLDivElement>(null);
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
    <div className="space-y-8 pt-3">
      {state.stopReason && EARLY.has(state.stopReason) && (
        <p className="text-sm text-weak">
          Stopped early: {STOP_LABEL[state.stopReason]}
          {state.stopDetail ? ` (${state.stopDetail})` : ""}. Showing what was tested so far.
        </p>
      )}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Test complete · {state.marketLabel}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">From first instinct to evidence-led plan.</h2>
      </div>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <PlanTable title="Initial concept" sub="LLM baseline · no Qloo" rows={first.components} />
        <PlanTable title="Evidence-led revision" sub={`Agent revision · Qloo tested in ${state.marketLabel}`} rows={last.components} accent changes={explanations} />
      </div>

      <div className="border-y border-line py-5">
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) window.setTimeout(() => review.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
          }}
          aria-expanded={open}
          aria-controls="compare-plans"
          className="group flex w-full items-center justify-between gap-4 text-left"
        >
          <span>
            <span className="block text-base font-semibold text-ink">{open ? "Close decision review" : "Open decision review"}</span>
            <span className="mt-1 block text-sm font-normal text-muted">See what changed, what stayed, and the evidence behind each decision.</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
            {n} change{n === 1 ? "" : "s"}
            <svg className={`transition-transform ${open ? "rotate-180" : ""}`} width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="m4 7 5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square" />
            </svg>
          </span>
        </button>
      </div>

      {open && (
        <div ref={review} className="scroll-mt-6">
          <PlanComparisonView state={state} explanations={explanations} />
        </div>
      )}
    </div>
  );
}
