"use client";

import { useState } from "react";
import type { BaselineResult } from "@/lib/agent/types";
import { DOMAINS, DOMAIN_LABEL, TARGET_MARKETS, confidence, type Market } from "@/lib/markets";
import { EXAMPLES } from "./examples";
import { highlight } from "./highlight";
import { MarketColumn } from "./market-column";
import { useTranscreate } from "./use-transcreate";

const MAX_MARKETS = 3;
const DOT = { strong: "●●●", usable: "●●○", off: "○○○" } as const;

const CHECK_LABEL: Record<BaselineResult["swaps"][number]["check"], string> = {
  not_in_qloo: "not found in Qloo",
  foreign: "foreign origin",
  local_evidence: "in the city's Qloo taste list",
  no_local_evidence: "in Qloo, but not distinctive in this city",
};

function CoverageMap() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 pr-3 font-normal">Market</th>
            {DOMAINS.map((d) => (
              <th key={d} className="py-1 pr-3 font-normal">
                {DOMAIN_LABEL[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TARGET_MARKETS.map((m) => (
            <tr key={m.id} className="border-t border-line">
              <td className="py-1.5 pr-3" style={{ color: `var(--${m.id})` }}>
                {m.label}
              </td>
              {DOMAINS.map((d) => {
                const c = confidence(m, d);
                return (
                  <td
                    key={d}
                    className={`py-1.5 pr-3 tracking-widest ${c === "off" ? "text-muted" : ""}`}
                    title={c}
                  >
                    {DOT[c]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Baseline({ results, markets }: { results: BaselineResult[]; markets: Market[] }) {
  if (results.length === 0)
    return (
      <p className="text-sm text-muted">
        The model-only version wasn&apos;t available for this run.
      </p>
    );
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {markets.map((m) => {
        const r = results.find((x) => x.marketId === m.id);
        if (!r) return null;
        return (
          <section key={m.id} className="rounded-lg border border-dashed border-line p-4">
            <h4 className="font-serif text-lg text-muted">{m.label}, model only</h4>
            <p className="mt-2 leading-relaxed text-ink-2">
              {highlight(
                r.text,
                r.swaps.map((s) => ({ needle: s.replacement, className: "ref" })),
              )}
            </p>
            <ul className="mt-3 space-y-1 text-xs">
              {r.swaps.map((s, i) => (
                <li
                  key={i}
                  className={
                    s.check === "local_evidence"
                      ? "text-ok"
                      : s.check === "no_local_evidence"
                        ? "text-muted"
                        : "text-flag"
                  }
                >
                  {s.original} → {s.replacement}: {CHECK_LABEL[s.check]}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function Transcreator() {
  const [text, setText] = useState<string>(EXAMPLES[0].text);
  const [picked, setPicked] = useState<string[]>([...EXAMPLES[0].markets]);
  const [showBaseline, setShowBaseline] = useState(false);
  const { state, run } = useTranscreate();
  const running = state.phase === "running";
  const chosen = TARGET_MARKETS.filter((m) => picked.includes(m.id));

  const toggle = (id: string) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_MARKETS ? p : [...p, id],
    );

  const refMarks = state.references.map((r) => ({
    needle: r.surface,
    className: "ref",
    title: r.entity ? `${r.entity.displayName}: ${r.job}` : `${r.surface}: not found in Qloo`,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">Transcreate</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
          Translate the references, not just the words.
        </h1>
        <p className="mt-4 text-lg text-ink-2">
          Paste copy written for Americans. An agent finds every cultural reference, works out the
          job it does, and uses Qloo&apos;s taste data to find what does that job for people in
          another city, with evidence for every swap.
        </p>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap gap-2 text-sm">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                disabled={running}
                onClick={() => {
                  setText(ex.text);
                  setPicked([...ex.markets]);
                }}
                className="rounded-full border border-line px-3 py-1 text-ink-2 hover:bg-paper-2 disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>
          <label htmlFor="copy" className="sr-only">
            Text to adapt
          </label>
          <textarea
            id="copy"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={2500}
            className="mt-3 w-full resize-y rounded-lg border border-line bg-card p-4 text-lg leading-relaxed outline-none focus:border-ink-2"
          />
        </div>
        <div>
          <p className="text-sm text-muted">Adapt for up to {MAX_MARKETS} cities</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TARGET_MARKETS.map((m) => {
              const on = picked.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={running}
                  aria-pressed={on}
                  onClick={() => toggle(m.id)}
                  className="rounded-full border px-4 py-1.5 text-sm transition disabled:opacity-50"
                  style={{
                    borderColor: on ? `var(--${m.id})` : "var(--line)",
                    color: on ? `var(--${m.id})` : "var(--ink-2)",
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={running || !text.trim() || picked.length === 0}
            onClick={() => run(text, picked)}
            className="mt-5 w-full rounded-lg bg-ink px-5 py-3 font-medium text-paper disabled:opacity-40"
          >
            {running ? "Translating…" : "Translate the culture →"}
          </button>
          <details className="mt-6 text-sm">
            <summary className="cursor-pointer text-muted">Where the data is strong enough</summary>
            <p className="mb-2 mt-2 text-ink-2">
              We launched only where Qloo&apos;s city-level taste data is deep and distinctive,
              measured per kind of culture. Gaps are flagged for a human, never guessed.
            </p>
            <CoverageMap />
          </details>
        </div>
      </section>

      {state.phase !== "idle" && (
        <section className="mt-12">
          {state.references.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm uppercase tracking-[0.2em] text-muted">Original</h2>
              <p className="mt-2 max-w-3xl text-lg leading-relaxed">
                {highlight(state.result?.original ?? text, refMarks)}
              </p>
              <p className="mt-2 text-xs text-muted">
                {state.references.length} references found ·{" "}
                {state.references.filter((r) => r.entity).length} matched in Qloo
              </p>
            </div>
          )}

          {running && (
            <ol className="mb-6 space-y-1 text-sm text-muted">
              {state.stages.slice(-4).map((s, i, arr) => (
                <li key={`${s.stage}-${i}`}>
                  {i === arr.length - 1 ? <span className="pulse">●</span> : "✓"} {s.message}
                </li>
              ))}
            </ol>
          )}

          {state.phase === "error" && (
            <p className="mb-6 rounded-md bg-flag-soft p-3 text-sm text-flag">{state.error}</p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {chosen.map((m) => (
              <MarketColumn
                key={m.id}
                market={m}
                result={state.markets[m.id]}
                decisions={state.decisions[m.id] ?? []}
                references={state.references}
                pending={running}
              />
            ))}
          </div>

          {state.phase === "done" && (
            <div className="mt-10">
              <button
                type="button"
                onClick={() => setShowBaseline((v) => !v)}
                className="text-sm underline decoration-line underline-offset-4"
              >
                {showBaseline ? "Hide" : "Compare with"} the same model without Qloo
              </button>
              {showBaseline && (
                <div className="mt-4">
                  <p className="mb-3 max-w-3xl text-sm text-muted">
                    Same model and text, no taste data. Each swap it made is looked up in Qloo
                    afterwards. This shows provenance, not proof of quality.
                  </p>
                  <Baseline results={state.baseline} markets={chosen} />
                </div>
              )}
              <p className="mt-6 text-xs text-muted">
                {state.replayed ? "Replayed from a saved run. " : ""}
                {state.result
                  ? `${state.result.stats.qlooCalls} Qloo calls · ${state.result.stats.llmCalls} model calls · ${Math.round(state.result.stats.ms / 1000)} s`
                  : ""}
                {state.replayed && (
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => run(text, picked, true)}
                  >
                    Run it live
                  </button>
                )}
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
