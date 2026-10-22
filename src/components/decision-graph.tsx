"use client";

import type { KeyboardEvent } from "react";
import { GRAPH_COLUMNS, NODE_KIND_LABEL, type DecisionGraph, type GraphEdge, type GraphNode, type GraphNodeKind } from "@/lib/crashtest/graph";
import type { ComponentStatus, Slot } from "@/lib/crashtest/types";

/**
 * The decision graph, drawn from buildDecisionGraph (itself built from the decision model).
 * Wide screens see every lane left to right; narrower ones see the selected lane top to bottom.
 * Node kinds differ by shape: parallelogram for your input, pill for Qloo, hexagon for the
 * application's evaluation, double frame for the final choice. Only the selected lane animates.
 */

const MARK: Record<ComponentStatus, string> = { supported: "✓", weak: "–", no_support: "×", unresolved: "?", constraint_conflict: "!" };
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function Shape({ kind, x, y, w, h, strong, accent }: { kind: GraphNodeKind; x: number; y: number; w: number; h: number; strong: boolean; accent: boolean }) {
  const stroke = accent ? "var(--accent)" : strong ? "var(--ink-2)" : "var(--line)";
  const common = { fill: "var(--panel)", stroke, strokeWidth: strong ? 1.4 : 1 };
  const l = x - w / 2;
  const r = x + w / 2;
  const t = y - h / 2;
  const b = y + h / 2;
  if (kind === "user") return <polygon points={`${l + 9},${t} ${r},${t} ${r - 9},${b} ${l},${b}`} {...common} />;
  if (kind === "qloo") return <rect x={l} y={t} width={w} height={h} rx={h / 2} {...common} />;
  if (kind === "app") return <polygon points={`${l + 11},${t} ${r - 11},${t} ${r},${y} ${r - 11},${b} ${l + 11},${b} ${l},${y}`} {...common} />;
  return (
    <g>
      <rect x={l} y={t} width={w} height={h} rx={3} {...common} />
      <rect x={l + 3} y={t + 3} width={w - 6} height={h - 6} rx={2} fill="none" stroke={stroke} strokeWidth={1} />
    </g>
  );
}

function Node({ n, x, y, w, h, strong, accent, chars }: { n: GraphNode; x: number; y: number; w: number; h: number; strong: boolean; accent?: boolean; chars: number }) {
  const sub = n.sub ? `${n.status ? `${MARK[n.status]} ` : ""}${n.sub}` : "";
  return (
    <g>
      <title>{`${NODE_KIND_LABEL[n.kind]}: ${n.label}${n.sub ? ` (${n.sub})` : ""}`}</title>
      <Shape kind={n.kind} x={x} y={y} w={w} h={h} strong={strong} accent={!!accent} />
      <text x={x} y={sub ? y - 3 : y + 4} textAnchor="middle" fontSize={10.5} fill="var(--ink)" fontWeight={n.kind === "final" ? 600 : 400}>
        {cut(n.label, chars)}
      </text>
      {sub && (
        <text x={x} y={y + 11} textAnchor="middle" fontSize={8.5} fill="var(--muted)" fontFamily="var(--font-mono)">
          {cut(sub, chars + 3)}
        </text>
      )}
    </g>
  );
}

function Edge({ m, d, active, label, lx, ly }: { m: string; d: string; active: boolean; label?: string; lx?: number; ly?: number }) {
  return (
    <g>
      <path d={d} fill="none" stroke={active ? "var(--accent)" : "var(--line)"} strokeWidth={active ? 1.4 : 1} markerEnd={`url(#${m}-${active ? "arrow-on" : "arrow"})`} className={active ? "graph-flow" : undefined} />
      {active && label && lx !== undefined && ly !== undefined && (
        <text x={lx} y={ly} textAnchor="middle" fontSize={8.5} fill="var(--accent)" fontFamily="var(--font-mono)">
          {label}
        </text>
      )}
    </g>
  );
}

/** Each SVG needs its own marker ids: a marker inside a hidden SVG does not render. */
function Markers({ m }: { m: string }) {
  return (
    <defs>
      {[
        ["arrow", "var(--line)"],
        ["arrow-on", "var(--accent)"],
      ].map(([id, c]) => (
        <marker key={id} id={`${m}-${id}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill={c} />
        </marker>
      ))}
    </defs>
  );
}

const onKeys = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

// ---------- wide: every lane, left to right ----------

const W = 840;
const COL = 140;
const NW = 120;
const NH = 46;
const TOP = 104;
const LANE = 80;
const cx = (c: number) => COL / 2 + c * COL;
const laneY = (i: number) => TOP + i * LANE + 46;

function WideGraph({ graph, active, onSelect }: { graph: DecisionGraph; active: Slot | null; onSelect: (s: Slot) => void }) {
  const H = TOP + graph.lanes.length * LANE + 8;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const activeIndex = graph.lanes.findIndex((l) => l.slot === active);
  // Brief inputs drop down the gutter left of the column they feed, then into the node.
  const inputEdge = (e: GraphEdge, i: number) => {
    const from = graph.inputs.find((n) => n.id === e.from)!;
    const to = byId.get(e.to)!;
    const off = from.id === "in:anchors" ? -6 : from.id === "in:market" ? 6 : 0;
    const gx = cx(to.column) - COL / 2 + off;
    const ty = laneY(i) + (from.id === "in:market" ? 9 : -9);
    const fx = cx(from.column);
    return { d: `M${fx},72 V86 H${gx} V${ty} H${cx(to.column) - NW / 2}`, lx: fx, ly: 98 };
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Decision graph">
      <Markers m="gw" />
      {GRAPH_COLUMNS.map((c, i) => (
        <text key={c} x={cx(i)} y={14} textAnchor="middle" fontSize={8.5} letterSpacing="0.08em" fill="var(--muted)" fontFamily="var(--font-mono)">
          {c.toUpperCase()}
        </text>
      ))}
      {graph.inputs.map((n) => (
        <Node key={n.id} n={n} x={cx(n.column)} y={50} w={NW} h={40} strong={activeIndex >= 0} chars={18} />
      ))}
      {activeIndex >= 0 &&
        graph.edges
          .filter((e) => e.lane === active && e.from.startsWith("in:"))
          .map((e) => {
            const p = inputEdge(e, activeIndex);
            return <Edge m="gw" key={`${e.from}-${e.to}`} d={p.d} active label={e.label} lx={p.lx} ly={p.ly} />;
          })}
      {graph.lanes.map((lane, i) => {
        const on = lane.slot === active;
        const dim = activeIndex >= 0 && !on;
        const y = laneY(i);
        const nodes = graph.nodes.filter((n) => n.lane === lane.slot);
        return (
          <g
            key={lane.slot}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`${lane.summary} Show this decision.`}
            onClick={() => onSelect(lane.slot)}
            onKeyDown={onKeys(() => onSelect(lane.slot))}
            className="graph-lane cursor-pointer"
            opacity={dim ? 0.45 : 1}
          >
            <rect className="lane-bg" x={2} y={TOP + i * LANE + 2} width={W - 4} height={LANE - 4} rx={4} fill={on ? "var(--panel)" : "transparent"} />
            <text x={10} y={TOP + i * LANE + 16} fontSize={8.5} letterSpacing="0.08em" fill="var(--muted)" fontFamily="var(--font-mono)">
              {lane.title.toUpperCase()}
            </text>
            {graph.edges
              .filter((e) => e.lane === lane.slot && !e.from.startsWith("in:"))
              .map((e) => {
                const a = byId.get(e.from)!;
                const b = byId.get(e.to)!;
                const x1 = cx(a.column) + NW / 2;
                const x2 = cx(b.column) - NW / 2;
                // The column headers name each step, so in-lane edges carry no label here.
                return <Edge m="gw" key={`${e.from}-${e.to}`} d={`M${x1},${y} H${x2}`} active={on} />;
              })}
            {nodes.map((n) => (
              <Node key={n.id} n={n} x={cx(n.column)} y={y} w={NW} h={NH} strong={on} accent={on && n.kind === "final" && lane.changed} chars={19} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ---------- narrow: the selected lane, top to bottom ----------

const VW = 340;
const VNW = 220;
const STEP = 70;

function TallGraph({ graph, slot }: { graph: DecisionGraph; slot: Slot }) {
  const nodes = graph.nodes.filter((n) => n.lane === slot);
  const edges = graph.edges.filter((e) => e.lane === slot);
  const yOf = new Map(nodes.map((n, i) => [n.id, 116 + i * STEP]));
  const H = 116 + (nodes.length - 1) * STEP + 34;
  const iw = graph.inputs.length === 3 ? 102 : 150;
  const ix = (i: number) => (VW - graph.inputs.length * iw - (graph.inputs.length - 1) * 8) / 2 + iw / 2 + i * (iw + 8);
  const left = VW / 2 - VNW / 2;
  return (
    <svg viewBox={`0 0 ${VW} ${H}`} className="w-full" role="group" aria-label="Decision graph, selected choice">
      <Markers m="gt" />
      {graph.inputs.map((n, i) => (
        <Node key={n.id} n={n} x={ix(i)} y={24} w={iw} h={40} strong chars={iw > 120 ? 22 : 14} />
      ))}
      {edges
        .filter((e) => e.from.startsWith("in:"))
        .map((e) => {
          const i = graph.inputs.findIndex((n) => n.id === e.from);
          const ty = yOf.get(e.to)! + (i - 1) * 7;
          const gx = left - 12 - i * 7;
          return <Edge m="gt" key={e.from} d={`M${ix(i)},44 V${56 + i * 6} H${gx} V${ty} H${left}`} active />;
        })}
      {edges
        .filter((e) => !e.from.startsWith("in:"))
        .map((e) => {
          const y1 = yOf.get(e.from)! + 23;
          const y2 = yOf.get(e.to)! - 23;
          return (
            <g key={`${e.from}-${e.to}`}>
              <Edge m="gt" d={`M${VW / 2},${y1} V${y2}`} active />
              {e.label && (
                <text x={VW / 2 + 8} y={(y1 + y2) / 2 + 3} fontSize={8.5} fill="var(--accent)" fontFamily="var(--font-mono)">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
      {nodes.map((n) => (
        <Node key={n.id} n={n} x={VW / 2} y={yOf.get(n.id)!} w={VNW} h={NH} strong accent={n.kind === "final"} chars={30} />
      ))}
    </svg>
  );
}

export function GraphLegend() {
  const items: GraphNodeKind[] = ["user", "qloo", "app", "final"];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
      {items.map((k) => (
        <li key={k} className="flex items-center gap-2">
          <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden>
            <Shape kind={k} x={13} y={8} w={24} h={13} strong accent={false} />
          </svg>
          {NODE_KIND_LABEL[k]}
        </li>
      ))}
    </ul>
  );
}

export function DecisionGraphView({ graph, active, onSelect }: { graph: DecisionGraph; active: Slot | null; onSelect: (s: Slot) => void }) {
  const current = active ?? graph.lanes[0]?.slot ?? null;
  return (
    <section aria-label="Decision graph" className="space-y-4">
      <div className="hidden lg:block">
        <WideGraph graph={graph} active={current} onSelect={onSelect} />
      </div>
      <div className="space-y-3 lg:hidden">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a decision">
          {graph.lanes.map((l) => (
            <button
              key={l.slot}
              type="button"
              aria-pressed={l.slot === current}
              onClick={() => onSelect(l.slot)}
              className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${l.slot === current ? "border-accent text-accent" : "border-line text-muted"}`}
            >
              {l.title}
              {l.changed ? " →" : " ="}
            </button>
          ))}
        </div>
        {current && <TallGraph graph={graph} slot={current} />}
      </div>
      <GraphLegend />
      <p className="text-xs text-muted">Lines show what was tested against what, and in which order. They show affinity and test results, not cause and effect.</p>
    </section>
  );
}
