import { visibleGraph, type JudgeGraph, type JudgeGraphNode } from "./judge-graph";
import type { Slot } from "./types";

/**
 * The replay as an ordered timeline derived from the graph alone (no model call). Lines travel
 * from source to target; a node that a line leads to appears as the line arrives. The overview
 * reveals the brief, then each decision along its own line, then the final plan and each
 * decision's line into it. A focused decision replays its recorded path: your choice, the
 * LLM's, the evidence one by one, each candidate, the full-plan re-test (rejected candidates
 * recede after it), the final choice and its line into the plan.
 */

export type ReplayEvent =
  | { type: "show_node"; nodeId: string; methodStep: number; at: number }
  | { type: "draw_edge"; edgeId: string; methodStep: number; at: number; duration: number }
  | { type: "recede_node"; nodeId: string; methodStep: number; at: number }
  | { type: "focus_node"; nodeId: string; methodStep: number; at: number };

export interface ReplayTimeline {
  events: ReplayEvent[];
  /** Shown from the start, as context. */
  initial: string[];
  duration: number;
}

export const NODE_GAP = 240;
export const EDGE_MS = 420;

const ORDER: Record<string, number> = { user: 0, lock: 1, rule: 2, llm: 3, q: 4, lookup: 5, candidate: 6, retest: 7, final: 8, qf: 9 };
/** user, lock, rule:c2, q:audience, candidate:0 … → their place in the replay. */
const rank = (n: JudgeGraphNode) => ORDER[n.id.split(":")[1]] ?? 10;

export function buildReplay(g: JudgeGraph, focus?: Slot | null): ReplayTimeline {
  const { nodes, edges } = visibleGraph(g, focus ?? undefined);
  const events: ReplayEvent[] = [];
  const shown = new Set<string>();
  const drawn = new Set<string>();
  let t = 0;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // The method strip only moves forward, so a later event never lights an earlier step.
  let reached = 1;
  const step = (...ids: string[]) => (reached = Math.max(reached, ...ids.map((id) => byId.get(id)?.step ?? 1)));

  const show = (id: string) => {
    if (shown.has(id)) return;
    shown.add(id);
    events.push({ type: "show_node", nodeId: id, methodStep: step(id), at: t });
    t += NODE_GAP;
  };
  const draw = (edgeId: string) => {
    const e = edges.find((x) => x.id === edgeId)!;
    drawn.add(edgeId);
    events.push({ type: "draw_edge", edgeId, methodStep: step(e.source, e.target), at: t, duration: EDGE_MS });
    t += EDGE_MS;
  };
  /** Lines from shown nodes into this one travel first and it appears as they arrive; its own lines to shown nodes follow. */
  const reveal = (id: string) => {
    for (const e of edges) if (e.target === id && shown.has(e.source) && !drawn.has(e.id)) draw(e.id);
    show(id);
    for (const e of edges) if (e.source === id && shown.has(e.target) && !drawn.has(e.id)) draw(e.id);
  };

  const initial: string[] = [];
  if (!focus) {
    reveal("brief");
    for (const d of g.decisions) reveal(`${d.slot}:final`);
    // The plan appears, then each decision's line travels into it, one at a time.
    show("plan");
    for (const d of g.decisions) {
      const into = edges.find((e) => e.source === `${d.slot}:final` && e.target === "plan");
      if (into) draw(into.id);
    }
  } else {
    // Context first: the brief, the plan and the other decisions are already there.
    for (const n of nodes)
      if (n.slot !== focus) {
        initial.push(n.id);
        shown.add(n.id);
      }
    for (const e of edges) if (shown.has(e.source) && shown.has(e.target)) drawn.add(e.id);
    const own = nodes.filter((n) => n.slot === focus).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
    for (const n of own) {
      reveal(n.id);
      // After the re-test, the candidates it rejected recede.
      if (n.kind === "test" && n.id.endsWith(":retest"))
        for (const c of own)
          if (c.kind === "candidate" && c.state === "rejected") {
            events.push({ type: "recede_node", nodeId: c.id, methodStep: step(n.id), at: t });
          }
    }
  }
  // Anything not yet drawn (an edge between two context nodes) completes at the end.
  for (const e of edges) if (!drawn.has(e.id)) draw(e.id);
  return { events, initial, duration: t };
}

/** When each node appears and each line starts, for the renderer. */
export function replayTimes(tl: ReplayTimeline) {
  const shownAt = new Map<string, number>(tl.initial.map((id) => [id, 0]));
  const recedeAt = new Map<string, number>();
  const edgeAt = new Map<string, { at: number; duration: number }>();
  for (const e of tl.events) {
    if (e.type === "show_node") shownAt.set(e.nodeId, e.at);
    else if (e.type === "recede_node") recedeAt.set(e.nodeId, e.at);
    else if (e.type === "draw_edge") edgeAt.set(e.edgeId, { at: e.at, duration: e.duration });
  }
  return { shownAt, recedeAt, edgeAt };
}

/** The method steps the strip should light, with when each begins. */
export function stepChanges(tl: ReplayTimeline): { at: number; step: number }[] {
  const out: { at: number; step: number }[] = [];
  for (const e of [...tl.events].sort((a, b) => a.at - b.at)) if (out.at(-1)?.step !== e.methodStep) out.push({ at: e.at, step: e.methodStep });
  return out;
}
