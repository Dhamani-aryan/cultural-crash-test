"use client";

import { OUTCOME_LABEL, type ComparisonOutcome, type PlanComparison } from "@/lib/crashtest/compare";
import { SLOT_LABEL, type EvidenceRecord } from "@/lib/crashtest/types";

const OUTCOME_STYLE: Record<ComparisonOutcome, { color: string; mark: string; short: string }> = {
  agent: { color: "var(--supported)", mark: "▲", short: "Agent better supported" },
  baseline: { color: "var(--nosupport)", mark: "▼", short: "LLM-only better supported" },
  mixed: { color: "var(--weak)", mark: "◆", short: "Level" },
  insufficient_evidence: { color: "var(--unresolved)", mark: "?", short: "Not enough evidence" },
  same: { color: "var(--muted)", mark: "=", short: "Same choice" },
};

function Outcome({ o }: { o: ComparisonOutcome }) {
  const s = OUTCOME_STYLE[o];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: s.color }}>
      <span aria-hidden>{s.mark}</span>
      {s.short}
    </span>
  );
}

/**
 * The deterministic comparison of the two plans. Every outcome here is computed by code from the
 * recorded evaluations (src/lib/crashtest/compare.ts); no model chose it.
 */
export function PlanComparisonView({ cmp, ledger }: { cmp: PlanComparison; ledger: EvidenceRecord[] }) {
  const byId = new Map(ledger.map((r) => [r.evidenceId, r]));
  const cited = [...new Set(cmp.componentComparisons.flatMap((c) => c.evidenceIds))].filter((id) => byId.has(id));
  return (
    <section id="compare-plans" aria-label="Compare plans" className="rounded-lg border border-accent bg-panel p-5">
      <p className="text-xs uppercase tracking-wide text-accent">Compare plans</p>
      <p className="mt-2 font-serif text-xl leading-snug" style={{ color: OUTCOME_STYLE[cmp.outcome].color }}>
        {OUTCOME_LABEL[cmp.outcome]}
      </p>
      <p className="mt-1 text-sm text-ink-2">{cmp.headline}</p>
      <p className="mt-2 text-xs text-muted">
        Supported choices {cmp.supportedDelta >= 0 ? "+" : ""}
        {cmp.supportedDelta} · contradicted {cmp.contradictedDelta >= 0 ? "+" : ""}
        {cmp.contradictedDelta}
        {cmp.scoreDelta !== undefined && ` · score ${cmp.scoreDelta >= 0 ? "+" : ""}${Math.round(cmp.scoreDelta * 100)}`} (agent vs LLM
        alone). Decided by code, in this order: hard constraints, contradicted choices, supported choices, evidence coverage, score.
      </p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {cmp.componentComparisons.map((c) => (
          <li key={c.slot} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm">
                <span className="text-muted">{SLOT_LABEL[c.slot]}: </span>
                {c.outcome === "same" ? (
                  <span className="text-ink">{c.agentChoice}</span>
                ) : (
                  <>
                    <span className="text-ink-2">{c.baselineChoice}</span> <span className="text-muted">vs</span>{" "}
                    <span className="text-ink">{c.agentChoice}</span>
                  </>
                )}
              </p>
              <Outcome o={c.outcome} />
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
              {c.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {c.evidenceIds.length > 0 && (
              <p className="mt-1 text-[11px] text-muted">
                Evidence:{" "}
                {c.evidenceIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ", "}
                    <a href={`#ev-${id}`} className="font-mono underline-offset-2 hover:underline">
                      {id}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">{cmp.coverageCaveat}</p>

      {cited.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-ink">Evidence records cited ({cited.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {cited.map((id) => {
              const r = byId.get(id)!;
              return (
                <li key={id} id={`ev-${id}`} className="scroll-mt-6 text-xs">
                  <span className="font-mono text-muted">{id}</span> <span className="text-ink-2">{r.purpose}</span>
                  <span className="block pl-8 text-[11px] text-muted">
                    {r.resultCount} results{r.results.length ? `: ${r.results.slice(0, 5).map((x) => x.name).join(", ")}` : ""} ·{" "}
                    <code className="break-all">{JSON.stringify(r.sanitizedRequest).slice(0, 220)}</code>
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
