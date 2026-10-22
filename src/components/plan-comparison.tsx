"use client";

import { useState } from "react";
import { comparePlans, OUTCOME_LABEL, type ComparisonOutcome } from "@/lib/crashtest/compare";
import type { ComponentChangeExplanation } from "@/lib/crashtest/explain";
import { toMarkdown } from "@/lib/crashtest/report";
import { SLOT_LABEL, STOP_LABEL, type EvidenceRecord, type RunState, type Slot } from "@/lib/crashtest/types";
import { StatusBadge } from "./status";

/**
 * Comparison mode: progressive disclosure over the recorded run. The overall outcome is
 * comparePlans (code, not a model); each choice opens to explain itself from the recorded
 * evaluations, changes and ledger. Nothing here calls Qloo or a model.
 */

const OUTCOME_STYLE: Record<ComparisonOutcome, { color: string; mark: string; short: string }> = {
  agent: { color: "var(--supported)", mark: "▲", short: "Agent better supported" },
  baseline: { color: "var(--nosupport)", mark: "▼", short: "LLM-only better supported" },
  mixed: { color: "var(--weak)", mark: "◆", short: "Level" },
  insufficient_evidence: { color: "var(--unresolved)", mark: "?", short: "Not enough evidence" },
  same: { color: "var(--muted)", mark: "=", short: "Kept" },
};

const OVERALL: Record<ComparisonOutcome, string> = {
  agent: "Agent better supported",
  baseline: "LLM-only better supported",
  mixed: "Mixed result",
  insufficient_evidence: "Insufficient evidence",
  same: "Same plan",
};

function Outcome({ o }: { o: ComparisonOutcome }) {
  const s = OUTCOME_STYLE[o];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium" style={{ color: s.color }}>
      <span aria-hidden>{s.mark}</span>
      {s.short}
    </span>
  );
}

function EvidenceList({ ids, ledger }: { ids: string[]; ledger: Map<string, EvidenceRecord> }) {
  return (
    <ul className="mt-2 space-y-2">
      {ids.map((id) => {
        const r = ledger.get(id);
        if (!r) return null;
        return (
          <li key={id} className="text-xs">
            <span className="font-mono text-muted">{id}</span> <span className="text-ink-2">{r.purpose}</span>{" "}
            <span className="text-muted">({r.coverageStatus})</span>
            <span className="mt-0.5 block pl-6 text-[11px] text-muted">
              {r.resultCount} result{r.resultCount === 1 ? "" : "s"}
              {r.results.length ? `: ${r.results.slice(0, 5).map((x) => x.name).join(", ")}` : ""}
            </span>
            <code className="mt-0.5 block break-all pl-6 text-[11px] text-muted">{JSON.stringify(r.sanitizedRequest).slice(0, 260)}</code>
            {r.warnings.length > 0 && <span className="block pl-6 text-[11px] text-weak">{r.warnings.join(" ")}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function Explanation({ e, ledger, id }: { e: ComponentChangeExplanation; ledger: Map<string, EvidenceRecord>; id: string }) {
  return (
    <div id={id} className="expand mt-3 space-y-3 rounded-lg bg-panel-2 p-4 text-sm">
      {e.changed ? (
        <>
          <section>
            <h4 className="text-ink">Why reconsider {e.originalChoice}?</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
              {e.reasonToReconsider.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="text-ink">Why {e.agentChoice}?</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
              {e.reasonForAgentChoice.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section>
          <h4 className="text-ink">Why {e.agentChoice} stayed</h4>
          <p className="mt-1 text-ink-2">{e.keptReason}</p>
          <p className="mt-1 text-ink-2">{e.agentFinding}</p>
        </section>
      )}
      {e.caveats.length > 0 && (
        <ul className="space-y-1 border-l-2 border-weak pl-3 text-xs text-ink-2">
          {e.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
      {e.rejectedChanges.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-ink">Other alternatives tested ({e.rejectedChanges.length})</summary>
          <ul className="mt-2 space-y-1.5 text-xs text-ink-2">
            {e.rejectedChanges.map((c, i) => (
              <li key={i}>
                <span className="text-ink">{c.after}</span>: not kept. {c.observedEffect}
              </li>
            ))}
          </ul>
        </details>
      )}
      {e.evidenceIds.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-ink">View Qloo evidence ({e.evidenceIds.length})</summary>
          <EvidenceList ids={e.evidenceIds} ledger={ledger} />
        </details>
      )}
    </div>
  );
}

function Row({
  e,
  outcome,
  open,
  onToggle,
  ledger,
}: {
  e: ComponentChangeExplanation;
  outcome: ComparisonOutcome;
  open: boolean;
  onToggle: () => void;
  ledger: Map<string, EvidenceRecord>;
}) {
  const panel = `why-${e.slot}`;
  return (
    <li className="py-4">
      <p className="text-xs text-muted">{SLOT_LABEL[e.slot]}</p>
      <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-ink-2">
          {e.originalChoice} <StatusBadge status={e.originalStatus} />
        </span>
        <span aria-hidden className="text-muted sm:px-1">
          {e.changed ? "→" : "="}
        </span>
        <span className="sr-only">{e.changed ? "changed to" : "kept as"}</span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panel}
          className="w-fit rounded text-left font-medium text-ink underline decoration-dotted decoration-muted underline-offset-4 hover:decoration-accent focus-visible:decoration-accent"
        >
          {e.agentChoice}
        </button>
        <StatusBadge status={e.agentStatus} />
        <span className="sm:ml-auto">
          <Outcome o={outcome} />
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panel}
        className="mt-2 text-xs text-accent hover:underline"
      >
        {open ? "Hide" : e.changed ? "Why this change?" : "Why it stayed"}
      </button>
      {open && <Explanation e={e} ledger={ledger} id={panel} />}
    </li>
  );
}

export function PlanComparisonView({ state, explanations }: { state: RunState; explanations: ComponentChangeExplanation[] }) {
  const cmp = comparePlans(state);
  const [open, setOpen] = useState<Set<Slot>>(new Set());
  const ledger = new Map(state.evidenceLedger.map((r) => [r.evidenceId, r]));
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!cmp || !first || !last) return null;

  const toggle = (slot: Slot) =>
    setOpen((prev) => {
      // Phones keep one explanation open at a time; larger screens may open several.
      const single = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
      const next = new Set(single ? [] : prev);
      if (prev.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  const download = () => {
    const url = URL.createObjectURL(new Blob([toMarkdown(state)], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `crash-test-${state.marketLabel.toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="compare-plans" aria-label="Compare plans" className="expand rounded-xl border border-line bg-panel p-5">
      <p className="font-serif text-xl" style={{ color: OUTCOME_STYLE[cmp.outcome].color }}>
        <span aria-hidden className="mr-2">
          {OUTCOME_STYLE[cmp.outcome].mark}
        </span>
        {OVERALL[cmp.outcome]}
      </p>
      <p className="mt-1 text-sm text-ink-2">{cmp.headline}</p>
      <p className="mt-2 text-xs text-muted">
        Supported: LLM alone {first.supported} of {first.components.length}, agent {last.supported} of {last.components.length} ·
        contradicted: {first.contradicted} → {last.contradicted}. Decided by code from the recorded evaluations ({OUTCOME_LABEL[cmp.outcome].toLowerCase()}).
      </p>

      <ul className="mt-3 divide-y divide-line border-t border-line">
        {explanations.map((e) => (
          <Row
            key={e.slot}
            e={e}
            outcome={cmp.componentComparisons.find((c) => c.slot === e.slot)?.outcome ?? "same"}
            open={open.has(e.slot)}
            onToggle={() => toggle(e.slot)}
            ledger={ledger}
          />
        ))}
      </ul>

      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer text-xs text-muted">Run details</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-ink-2">
          <dt className="text-muted">Stopped</dt>
          <dd>
            {state.stopReason ? STOP_LABEL[state.stopReason] : "–"}
            {state.stopDetail ? ` (${state.stopDetail})` : ""}
          </dd>
          <dt className="text-muted">Repair rounds</dt>
          <dd>
            {state.currentIteration} of {state.maxIterations}
          </dd>
          <dt className="text-muted">Qloo calls</dt>
          <dd>
            {state.qlooCallsUsed} of {state.maxQlooCalls}
          </dd>
          <dt className="text-muted">Model calls</dt>
          <dd>{state.llmCalls}</dd>
          <dt className="text-muted">Rubric</dt>
          <dd>{last.rubricVersion} (scores are this app&apos;s own, not a forecast)</dd>
        </dl>
        <button type="button" onClick={download} className="mt-2 text-xs text-accent hover:underline">
          Download report
        </button>
      </details>
    </section>
  );
}
