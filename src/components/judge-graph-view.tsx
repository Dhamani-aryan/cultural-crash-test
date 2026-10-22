"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { DecisionExplanation } from "@/lib/crashtest/explain";
import { buildJudgeGraph, KIND_LABEL, pathText, type JudgeGraphNode, type JudgeNodeKind } from "@/lib/crashtest/judge-graph";
import { layoutGraph } from "@/lib/crashtest/judge-layout";
import type { RunState, Slot } from "@/lib/crashtest/types";

/**
 * The decision graph view: a guided 3D path beside a text explanation that says the same thing.
 * The text panel is complete on its own: it is the keyboard route and the fallback when WebGL
 * is unavailable. Nothing here calls Qloo or a model; it reads the recorded run.
 */

const Scene = dynamic(() => import("./judge-graph-scene"), { ssr: false });

/** Runs whose graph has already played its one-time reveal in this tab. */
const played = new Set<string>();

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shape icons for the legend and the text path; they match the 3D shapes. */
export function KindIcon({ kind, className = "" }: { kind: JudgeNodeKind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4 };
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className={className}>
      {kind === "brief" && <rect x="3.5" y="3.5" width="9" height="9" {...common} />}
      {kind === "llm_choice" && <circle cx="8" cy="8" r="4.5" fill="currentColor" />}
      {kind === "qloo_evidence" && <rect x="2" y="5.5" width="12" height="5" rx="2.5" fill="currentColor" />}
      {kind === "candidate" && <circle cx="8" cy="8" r="4.5" {...common} />}
      {kind === "test" && <path d="M8 2.5 13.5 8 8 13.5 2.5 8Z" {...common} />}
      {(kind === "final_choice" || kind === "plan") && (
        <>
          <circle cx="8" cy="8" r="3" fill="currentColor" />
          <circle cx="8" cy="8" r="6" {...common} strokeWidth={1} />
        </>
      )}
    </svg>
  );
}

const LEGEND: JudgeNodeKind[] = ["brief", "llm_choice", "qloo_evidence", "candidate", "test", "final_choice"];

function Inspector({ node, state, recorded, onClose }: { node: JudgeGraphNode; state: RunState; recorded: boolean; onClose: () => void }) {
  const records = node.evidenceIds.map((id) => state.evidenceLedger.find((r) => r.evidenceId === id)).filter((r) => !!r);
  const first = records[0];
  const thin = node.state === "uncertain" || (first && first.coverageStatus !== "usable");
  return (
    <div role="dialog" aria-label={`${KIND_LABEL[node.kind]}: ${node.label}`} className="w-[290px] rounded-lg border border-white/10 bg-[#1d2024] p-3.5 text-left text-[12px] leading-5 text-white/80 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/45">{KIND_LABEL[node.kind]}</p>
          <p className="text-[13px] font-semibold text-white">{node.label}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inspector" className="-m-2 min-h-11 min-w-11 text-white/50 hover:text-white">
          ×
        </button>
      </div>
      {node.detail && <p className="mt-1.5">{node.detail}</p>}
      {node.kind === "candidate" && node.change && <p className="mt-1.5 text-white/60">Agent&apos;s recorded reason: {node.change.reason}</p>}
      {first && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px]">
          <dt className="text-white/45">Query</dt>
          <dd>{first.purpose}</dd>
          <dt className="text-white/45">Returned</dt>
          <dd>
            {first.resultCount} result{first.resultCount === 1 ? "" : "s"}
            {first.results.length ? `: ${first.results.slice(0, 5).map((x) => x.name).join(", ")}` : ""}
          </dd>
          <dt className="text-white/45">Context</dt>
          <dd>
            {state.marketLabel} · {state.brief.audienceDescription}
          </dd>
          <dt className="text-white/45">Coverage</dt>
          <dd>{first.coverageStatus}</dd>
          <dt className="text-white/45">Source</dt>
          <dd>{recorded ? "Recorded Qloo result" : "Live Qloo result"}</dd>
        </dl>
      )}
      {thin && <p className="mt-2 text-[#e2a84f]">No full result was returned for this check; coverage may be incomplete. That is missing evidence, not evidence against the choice.</p>}
      {records.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-white/50">Technical details ({records.length} record{records.length === 1 ? "" : "s"})</summary>
          <ul className="mt-1 space-y-1.5">
            {records.map((r) => (
              <li key={r.evidenceId} className="text-[10.5px] text-white/55">
                <span className="font-mono">{r.evidenceId}</span> {r.purpose}
                <code className="block break-all text-white/40">{JSON.stringify(r.sanitizedRequest).slice(0, 300)}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function JudgeGraphView({
  state,
  decisions,
  recorded,
  focus,
  onFocus,
  onStep,
}: {
  state: RunState;
  decisions: DecisionExplanation[];
  recorded: boolean;
  focus: Slot | null;
  onFocus: (slot: Slot | null) => void;
  onStep: (step: number | null) => void;
}) {
  const graph = useMemo(() => buildJudgeGraph(state, decisions), [state, decisions]);
  const layout = useMemo(() => layoutGraph(graph, focus), [graph, focus]);
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(prefersReduced);
  const [inspect, setInspect] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  // The reveal plays once per run; afterwards the graph opens complete.
  // Pure initialiser (React may call it twice); the run is marked as played once it finishes.
  const [reveal, setReveal] = useState(() => (!played.has(state.runId) && !prefersReduced() ? 0 : 6));

  useEffect(() => {
    if (reveal >= 6) {
      played.add(state.runId);
      const t = window.setTimeout(() => onStep(null), 1200);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => {
        onStep(reveal + 1);
        setReveal(reveal + 1);
      },
      reveal === 0 ? 200 : 650,
    );
    return () => window.clearTimeout(t);
  }, [reveal, onStep, state.runId]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setInspect(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const select = (slot: Slot | null) => {
    setInspect(null);
    onFocus(slot);
  };
  const node = inspect ? graph.nodes.find((n) => n.id === inspect) : undefined;
  const text = focus ? graph.decisions.find((d) => d.slot === focus) : undefined;
  const path = focus ? pathText(graph, focus) : [];
  const inspector = node ? <Inspector node={node} state={state} recorded={recorded} onClose={() => setInspect(null)} /> : null;
  const btn = "min-h-11 rounded-md px-3 text-xs font-medium";

  const pick = (on: boolean) => `${btn} border ${on ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:bg-panel-2"}`;

  return (
    <section aria-label="Decision graph" className="space-y-4">
      <div role="group" aria-label="Choose a decision" className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={!focus} onClick={() => select(null)} className={pick(!focus)}>
          Overview
        </button>
        {graph.decisions.map((d) => (
          <button key={d.slot} type="button" aria-pressed={focus === d.slot} onClick={() => select(d.slot)} className={pick(focus === d.slot)}>
            {d.title}
            {d.changed ? " · changed" : ""}
          </button>
        ))}
      </div>

      {/* The short explanation sits right above the canvas, so the text and the path are read together. */}
      {text ? (
        <div aria-live="polite" className="text-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted">{text.title}</p>
          <p className="mt-1 text-base font-semibold text-ink">{text.headline}</p>
          {text.lines.map((l, i) => (
            <p key={i} className="mt-1 max-w-3xl leading-6 text-ink-2">
              {l}
            </p>
          ))}
        </div>
      ) : (
        <div aria-live="polite" className="text-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted">Overview</p>
          <p className="mt-1 max-w-3xl leading-6 text-ink-2">
            Your brief leads to four decisions and the final plan.{" "}
            {graph.decisions.map((d, i) => (
              <span key={d.slot}>
                {i ? " · " : ""}
                <span className="text-muted">{d.title}:</span> <span className="text-ink">{d.headline}</span>
              </span>
            ))}
            . Select a decision to see the Qloo evidence, the candidates tested and the full-plan re-test behind it.
          </p>
        </div>
      )}

      <div className="relative h-[380px] overflow-hidden rounded-xl border border-line bg-[#141619] sm:h-[480px]">
        {webgl ? (
          <Scene
            graph={graph}
            layout={layout}
            focus={focus}
            reveal={reveal}
            reduced={reduced}
            inspect={inspect}
            fitKey={fitKey}
            onSelect={(n) => {
              if (n.kind === "qloo_evidence" || n.kind === "candidate") setInspect(n.id === inspect ? null : n.id);
              else if (n.kind === "final_choice" && n.slot) select(n.slot === focus ? null : n.slot);
              else if (n.kind === "plan" || n.kind === "brief") select(null);
            }}
            onMiss={() => setInspect(null)}
            inspector={inspector}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/60">
            The 3D view isn&apos;t available in this browser. The same decision path is listed below.
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1.5">
          {webgl && (
            <button type="button" onClick={() => setFitKey((k) => k + 1)} className={`${btn} bg-white/10 text-white/85 hover:bg-white/20`}>
              Fit graph
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setInspect(null);
              setReveal(reduced ? 6 : 0);
            }}
            className={`${btn} bg-white/90 text-[#141619] hover:bg-white`}
          >
            Replay decision path
          </button>
        </div>
        <ul aria-label="Legend" className="pointer-events-none absolute bottom-2 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-white/60">
          {LEGEND.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <KindIcon kind={k} />
              {KIND_LABEL[k]}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#6fa8ff]" /> Qloo
            <span className="ml-1 h-2 w-2 rounded-full bg-[#e2a84f]" /> rejected or uncertain
            <span className="ml-1 h-2 w-2 rounded-full bg-[#5fcf95]" /> final
          </li>
        </ul>
      </div>

      {/* On phones, and without WebGL, the inspector opens here instead of beside its node. */}
      {inspector && <div className={webgl ? "sm:hidden" : ""}>{inspector}</div>}

      {path.length > 0 && (
        <div className="text-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted">Evidence path</p>
          <ol className="mt-1.5 gap-x-8 md:columns-2">
            {path.map((p) => (
              <li key={p.id} className="mb-1 flex break-inside-avoid gap-2 text-[12.5px] leading-5 text-ink-2">
                <KindIcon kind={p.kind} className="mt-[3px] shrink-0 text-muted" />
                {p.inspectable ? (
                  <button
                    type="button"
                    onClick={() => setInspect(p.id === inspect ? null : p.id)}
                    aria-expanded={inspect === p.id}
                    className="text-left underline decoration-line underline-offset-2 hover:decoration-accent"
                  >
                    {p.text}
                  </button>
                ) : (
                  <span>{p.text}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="text-xs leading-5 text-muted">
        Drag to orbit, scroll or pinch to zoom, select a node to inspect it. Lines name a relationship (tested against, supports, rejected after re-test); they show affinity and test
        results, not cause and effect or commercial success.
      </p>
    </section>
  );
}
