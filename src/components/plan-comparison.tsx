"use client";

import { useState } from "react";
import type { DecisionEvidence, DecisionExplanation } from "@/lib/crashtest/explain";
import { toMarkdown } from "@/lib/crashtest/report";
import { SLOT_LABEL, SLOTS, STOP_LABEL, type EvidenceRecord, type RunState, type Slot } from "@/lib/crashtest/types";
import { StatusBadge } from "./status";

/**
 * The decision matrix: one aligned row per choice across three stages (your brief, the LLM
 * completion, the Qloo-tested agent), with the deciding reason between the last two. Every
 * word comes from the deterministic decision model (src/lib/crashtest/explain.ts); nothing here
 * calls Qloo or a model.
 */

const SOURCE_LABEL: Record<DecisionEvidence["source"], string> = {
  qloo: "Qloo result",
  user: "User constraint",
  application: "Application evaluation",
};

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.12em] text-muted";
const pad = (n: number) => String(n).padStart(2, "0");

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

/** Three human-readable evidence blocks, each with its provenance. */
export function EvidenceSummary({ evidence }: { evidence: DecisionEvidence[] }) {
  return (
    <ul className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
      {evidence
        .filter((e) => e.kind !== "constraint")
        .map((e) => (
          <li key={e.kind} className="bg-panel px-3 py-3">
            <p className={eyebrow}>{e.label}</p>
            <p className="mt-1.5 text-[13px] leading-5 text-ink">{e.value}</p>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{SOURCE_LABEL[e.source]}</p>
          </li>
        ))}
    </ul>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <h4 className={eyebrow}>{title}</h4>
      <div className="text-sm leading-6 text-ink-2">{children}</div>
    </section>
  );
}

/** The opened decision, in a fixed order: stages, why, what stayed fixed, proof, limits. */
export function DecisionDetail({ d, ledger, id, labelledBy }: { d: DecisionExplanation; ledger: Map<string, EvidenceRecord>; id: string; labelledBy?: string }) {
  const stages: [string, string][] = [
    ["Your brief", d.userChoice ? `${d.userChoice.label}${d.userChoice.locked ? " · fixed" : ""}` : "Not specified"],
    ["LLM completion", `${d.baseline.label} · ${d.baseline.origin === "user_provided" ? "carried forward" : "added by LLM"}`],
    ["Agent revision", `${d.revised.label} · ${d.changed ? "changed" : "retained"}`],
  ];
  const constraint = d.evidence.find((e) => e.kind === "constraint");
  return (
    <div id={id} role="region" aria-labelledby={labelledBy} className="expand space-y-5 border-l-2 border-accent bg-panel/60 px-4 py-5 sm:px-6">
      <p className={eyebrow}>
        Decision {pad(d.sequence)} · {SLOT_LABEL[d.slot]}
      </p>
      <dl className="grid grid-cols-[8.5rem_1fr] gap-x-4 gap-y-1 text-sm">
        {stages.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {d.changed ? (
        <>
          <Block title="Why move away">{d.whyAway.join(" ")}</Block>
          <Block title="Why this replacement">{d.whyToward.join(" ")}</Block>
        </>
      ) : (
        <Block title="Why it stayed">{d.whyStayed.join(" ")}</Block>
      )}
      <Block title="What stayed fixed">{d.preservedConstraints.join(" ")}</Block>
      <section className="space-y-2">
        <h4 className={eyebrow}>Proof</h4>
        <EvidenceSummary evidence={d.evidence} />
        {constraint && (
          <p className="text-xs text-ink-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{SOURCE_LABEL.user}</span> {constraint.value}
          </p>
        )}
      </section>
      <Block title="Limits">
        <ul className="space-y-1">
          {d.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </Block>
      <div className="space-y-2 border-t border-line pt-3">
        {d.alternatives.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-ink">Other candidates tested ({d.alternatives.length})</summary>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-2">
              {d.alternatives.map((c, i) => (
                <li key={i}>
                  <span className="text-ink">{c.after}</span>: not kept. {c.observedEffect}
                </li>
              ))}
            </ul>
          </details>
        )}
        {d.evidenceIds.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-ink">Inspect recorded evidence ({d.evidenceIds.length})</summary>
            <EvidenceList ids={d.evidenceIds} ledger={ledger} />
          </details>
        )}
      </div>
    </div>
  );
}

function Cell({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      {/* The stage label stays visible on phones; wide screens read it from the column header. */}
      <p className={`${eyebrow} mb-1 lg:sr-only`}>{label}</p>
      {children}
    </div>
  );
}

const sub = "mt-1 block font-mono text-[9px] uppercase tracking-[0.09em]";

export function DecisionRow({ d, open, onToggle, ledger }: { d: DecisionExplanation; open: boolean; onToggle: () => void; ledger: Map<string, EvidenceRecord> }) {
  const panel = `decision-${d.slot}`;
  const control = `review-${d.slot}`;
  return (
    <li className="border-b border-line">
      {/* The whole row opens the decision for a mouse; the Review button is the keyboard control. */}
      <div
        onClick={onToggle}
        className={`grid cursor-pointer grid-cols-2 gap-x-4 gap-y-4 py-5 transition-colors hover:bg-panel/50 lg:grid-cols-[7rem_1fr_1fr_1.35fr_1fr] lg:gap-5 lg:px-2 ${open ? "bg-panel/50" : ""}`}
      >
        <p className="col-span-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted lg:col-span-1 lg:pt-0.5">
          <span className="text-ink">{pad(d.sequence)}</span> {SLOT_LABEL[d.slot]}
        </p>
        <Cell label="Your brief">
          {d.userChoice ? (
            <>
              <span className="text-sm text-ink">{d.userChoice.label}</span>
              <span className={`${sub} text-muted`}>User supplied{d.userChoice.locked ? " · fixed" : ""}</span>
            </>
          ) : (
            <span className="text-sm italic text-muted">Not specified</span>
          )}
        </Cell>
        <Cell label="LLM completion">
          <span className="text-sm text-ink">{d.baseline.label}</span>
          <span className={`${sub} text-muted`}>{d.baseline.origin === "user_provided" ? "From your brief" : "Added by LLM"}</span>
          <span className="mt-1 block">
            <StatusBadge status={d.baseline.status} />
          </span>
        </Cell>
        <Cell label="Evidence / decision" className="col-span-2 border-l-2 border-line pl-3 lg:col-span-1 lg:border-l-0 lg:pl-0">
          <p className="flex gap-2 text-sm leading-5 text-ink-2">
            <span aria-hidden className={d.changed ? "text-accent" : "text-muted"}>
              {d.changed ? "→" : "="}
            </span>
            <span>
              <span className="sr-only">{d.changed ? "Changed: " : "Retained: "}</span>
              {d.summaryReason}
            </span>
          </p>
          <button
            id={control}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={open}
            aria-controls={panel}
            className="mt-2 font-mono text-[10px] uppercase tracking-[0.09em] text-accent hover:underline focus-visible:underline"
          >
            {open ? "Close decision" : "Review decision →"}
          </button>
        </Cell>
        <Cell label="Qloo-tested agent" className="col-span-2 lg:col-span-1">
          <span className={`text-sm font-semibold ${d.changed ? "text-accent" : "text-ink"}`}>{d.revised.label}</span>
          <span className={`${sub} ${d.changed ? "text-accent" : "text-muted"}`}>{d.changed ? "Changed by agent" : "Retained"}</span>
          <span className="mt-1 block">
            <StatusBadge status={d.revised.status} />
          </span>
        </Cell>
      </div>
      {open && (
        <div className="pb-5">
          <DecisionDetail d={d} ledger={ledger} id={panel} labelledBy={control} />
        </div>
      )}
    </li>
  );
}

export function DecisionMatrix({ decisions, ledger }: { decisions: DecisionExplanation[]; ledger: Map<string, EvidenceRecord> }) {
  // One decision open at a time on every screen, so the before/after context never scrolls away.
  const [open, setOpen] = useState<Slot | null>(null);
  const [planOrder, setPlanOrder] = useState(false);
  const rows = planOrder ? [...decisions].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)) : decisions;
  return (
    <section aria-label="Decision matrix">
      <div className="flex items-baseline justify-between gap-4 pb-2">
        <p className={eyebrow}>{planOrder ? "In plan order" : "Changes first"}</p>
        <button type="button" onClick={() => setPlanOrder((v) => !v)} className="text-xs text-muted hover:text-ink">
          {planOrder ? "Show changes first" : "Show plan order"}
        </button>
      </div>
      <div aria-hidden className={`hidden border-y border-line py-2 lg:grid lg:grid-cols-[7rem_1fr_1fr_1.35fr_1fr] lg:gap-5 lg:px-2 ${eyebrow}`}>
        <span>Choice</span>
        <span>Your brief</span>
        <span>LLM completion</span>
        <span>Evidence / decision</span>
        <span>Qloo-tested agent</span>
      </div>
      <ol className="border-t border-line lg:border-t-0">
        {rows.map((d) => (
          <DecisionRow key={d.slot} d={d} open={open === d.slot} onToggle={() => setOpen((o) => (o === d.slot ? null : d.slot))} ledger={ledger} />
        ))}
      </ol>
    </section>
  );
}

/** Methodology, budgets and the report: available, never in the way. */
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
      <summary className="cursor-pointer text-xs text-muted">Run methodology</summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-ink-2">
        <li>The LLM completed the plan from your brief, without Qloo.</li>
        <li>Every choice was tested against Qloo for this audience and market.</li>
        <li>Only choices the evidence contradicted (or, where allowed, thin ones) were opened; fixed choices never were.</li>
        <li>Candidates were searched in Qloo, checked against your rules and re-tested in the full plan.</li>
        <li>A candidate was kept only when the re-tested plan improved; otherwise the original stayed.</li>
      </ol>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-ink-2">
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
        <dd>{last?.rubricVersion ?? "–"} (scores are this app&apos;s own, not a forecast)</dd>
      </dl>
      <button type="button" onClick={download} className="mt-2 text-xs text-accent hover:underline">
        Download report
      </button>
    </details>
  );
}
