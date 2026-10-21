"use client";

import { useState } from "react";
import { SLOT_LABEL, type EvidenceRecord, type Slot } from "@/lib/crashtest/types";
import { CoverageTag } from "./status";
import type { View } from "./use-crash-test";

const STAGE_LABEL: Record<string, string> = {
  validate: "Brief",
  draft: "Draft",
  resolve: "Resolve",
  evaluate: "Test",
  repair: "Research",
  retest: "Re-test",
  report: "Report",
};

function Operation({ r }: { r: EvidenceRecord }) {
  return (
    <li className="border-t border-line py-2 text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xs text-muted">{r.evidenceId}</span>
        <span className="min-w-0 flex-1 text-ink-2">{r.purpose}</span>
        <CoverageTag coverage={r.coverageStatus} />
      </div>
      <p className="mt-0.5 pl-9 text-xs text-muted">
        {r.queryKind} · {r.resultCount} result{r.resultCount === 1 ? "" : "s"}
        {r.results.length > 0 && ` · ${r.results.slice(0, 4).map((x) => x.name).join(", ")}`}
      </p>
      <details className="mt-1 pl-9">
        <summary className="cursor-pointer text-xs text-muted">Request</summary>
        <pre className="mt-1 overflow-x-auto rounded bg-panel-2 p-2 text-[11px] leading-snug text-ink-2">
          {JSON.stringify(r.sanitizedRequest, null, 1)}
        </pre>
        {r.warnings.length > 0 && <p className="mt-1 text-xs text-nosupport">{r.warnings.join(" ")}</p>}
      </details>
    </li>
  );
}

export function AgentConsole({ view, onCancel }: { view: View; onCancel: () => void }) {
  const [allOps, setAllOps] = useState(false);
  const running = view.phase === "running";
  const lastStage = [...view.log].reverse().find((l) => l.kind === "stage");
  const round = [...view.log].reverse().find((l) => l.kind === "action");
  const ops = [...view.evidence].reverse();
  const shown = allOps ? ops : ops.slice(0, 8);
  const max = view.result?.maxIterations;

  return (
    <section aria-label="Agent console" className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          {running && <span className="pulse text-accent" aria-hidden>●</span>}
          <span className="text-ink">
            {running ? (lastStage?.kind === "stage" ? lastStage.message : "Starting…") : view.phase === "done" ? "Run finished" : "Stopped"}
          </span>
        </span>
        <span className="text-muted">
          Repair round {round?.kind === "action" ? round.iteration : 0}
          {max !== undefined ? ` of ${max}` : ""}
        </span>
        {view.budget && (
          <span className="text-muted">
            Qloo calls {view.budget.used} / {view.budget.max}
          </span>
        )}
        {running && (
          <button type="button" onClick={onCancel} className="ml-auto rounded border border-line px-3 py-1 text-ink-2 hover:border-muted">
            Stop
          </button>
        )}
      </header>
      {view.replay && <p className="border-b border-line bg-panel-2 px-4 py-2 text-xs text-accent">{view.replay}</p>}

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol className="space-y-3 px-4 py-4 lg:border-r lg:border-line" aria-live="polite">
          {view.log.map((l, i) => {
            if (l.kind === "stage")
              return (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-muted">{STAGE_LABEL[l.stage] ?? l.stage}</span>
                  <span className="text-ink-2">{l.message}</span>
                </li>
              );
            if (l.kind === "evaluation")
              return (
                <li key={i} className="ml-[4.75rem] text-xs text-muted">
                  Result: {l.evaluation.supported} of {l.evaluation.components.length} choices supported
                  {l.evaluation.totalScore !== undefined && ` · plan score ${Math.round(l.evaluation.totalScore * 100)}`}
                </li>
              );
            if (l.kind === "action")
              return (
                <li key={i} className="ml-[4.75rem] rounded-md border border-line bg-panel-2 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-accent">Why this step? · round {l.iteration}</p>
                  <p className="mt-1 text-ink-2">{l.why}</p>
                </li>
              );
            const c = l.change;
            return (
              <li key={i} className="ml-[4.75rem] text-sm">
                <p>
                  <span className="text-muted">{SLOT_LABEL[c.slot as Slot]}:</span>{" "}
                  <span className="text-muted line-through">{c.before}</span> → <span className="font-medium text-ink">{c.after}</span>
                  {c.reverted && <span className="ml-2 text-xs text-weak">tested, not kept</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted">{c.observedEffect}</p>
              </li>
            );
          })}
          {running && view.log.length === 0 && <li className="text-sm text-muted">Waiting for the agent…</li>}
        </ol>

        <div className="px-4 py-4">
          <h3 className="flex items-baseline justify-between text-sm">
            <span className="text-ink">Qloo operations</span>
            <span className="text-xs text-muted">{view.evidence.length} recorded</span>
          </h3>
          <ul className="mt-2">
            {shown.map((r) => (
              <Operation key={r.evidenceId} r={r} />
            ))}
          </ul>
          {ops.length > 8 && (
            <button type="button" onClick={() => setAllOps((x) => !x)} className="mt-2 text-xs text-accent">
              {allOps ? "Show recent only" : `Show all ${ops.length}`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
