import { visibleGraph, type JudgeGraph, type JudgeGraphEdge, type JudgeGraphNode, type JudgeNodeKind } from "./judge-graph";
import type { Slot } from "./types";

/**
 * Where each graph node sits, and how each edge is routed, computed from the graph alone: same
 * run, same picture. The overview is a left-to-right flow: your brief, the four decisions in one
 * column, the final plan. A focused decision spreads its path into columns by replay step, while
 * the other decisions recede beside the plan. Edges are curves clipped at the visible edge of
 * each shape, and each takes the first deterministic lane that clears every unrelated node.
 */

export type Vec3 = [number, number, number];

export interface RoutedEdge {
  edgeId: string;
  /** The route, already clipped to both shapes' boundaries. */
  points: Vec3[];
  sourceRadius: number;
  targetRadius: number;
  lane: number;
  /** Other clean routes, best first, for when a label sits on this one. */
  alternatives: Vec3[][];
}

export interface GraphLayout {
  positions: Record<string, Vec3>;
  /** Nodes on the path being looked at; everything else recedes. */
  active: Set<string>;
  /** Centre and size of the active nodes and their labels, for fitting the camera. */
  center: Vec3;
  size: [number, number];
  routes: Record<string, RoutedEdge>;
}

/** The visible radius of each shape, in world units (rings included). */
export const NODE_RADIUS: Record<JudgeNodeKind, number> = {
  plan: 0.56,
  final_choice: 0.4,
  brief: 0.28,
  llm_choice: 0.24,
  qloo_evidence: 0.27,
  candidate: 0.24,
  test: 0.3,
};

const SPACING = 1.85;
/** Clearance kept between a route and any unrelated node. */
const CLEAR = 0.18;
const LANE = 0.75;
const LANES = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
const SAMPLES = 24;

function column(nodes: JudgeGraphNode[], x: number, out: Record<string, Vec3>) {
  nodes.forEach((n, i) => {
    const y = ((nodes.length - 1) / 2 - i) * SPACING;
    // A shallow alternating depth gives parallax without changing the front-facing picture.
    out[n.id] = [x, y, i % 2 ? -0.15 : 0.15];
  });
}

const dist2 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** A quadratic curve from a to b whose control point is pushed sideways by `offset`. */
function curve(a: Vec3, b: Vec3, offset: number): Vec3[] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  const c: Vec3 = [(a[0] + b[0]) / 2 + nx * offset * 2, (a[1] + b[1]) / 2 + ny * offset * 2, (a[2] + b[2]) / 2];
  const out: Vec3[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1], u * u * a[2] + 2 * u * t * c[2] + t * t * b[2]]);
  }
  return out;
}

/** Cut a route where it leaves the source shape and where it enters the target shape. */
function clip(pts: Vec3[], a: Vec3, ra: number, b: Vec3, rb: number): Vec3[] {
  const outside = (p: Vec3) => dist2(p, a) >= ra && dist2(p, b) >= rb;
  const lerp = (p: Vec3, q: Vec3, t: number): Vec3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  // Binary-search the exact crossing between an inside and an outside sample.
  const edge = (inside: Vec3, out: Vec3, centre: Vec3, r: number) => {
    let [lo, hi] = [0, 1];
    for (let k = 0; k < 12; k++) {
      const m = (lo + hi) / 2;
      if (dist2(lerp(inside, out, m), centre) < r) lo = m;
      else hi = m;
    }
    return lerp(inside, out, hi);
  };
  const first = pts.findIndex(outside);
  let last = -1;
  for (let i = pts.length - 1; i >= 0; i--) if (outside(pts[i])) {
    last = i;
    break;
  }
  if (first < 0 || last <= first) return [];
  const out = pts.slice(first, last + 1);
  if (first > 0) out.unshift(edge(pts[first - 1], pts[first], a, ra));
  if (last < pts.length - 1) out.push(edge(pts[last + 1], pts[last], b, rb));
  return out;
}

/** How many samples of a route come within an obstacle's padded radius. */
function hits(pts: Vec3[], obstacles: { c: Vec3; r: number }[]): number {
  let n = 0;
  for (const p of pts) for (const o of obstacles) if (dist2(p, o.c) < o.r) n++;
  return n;
}

function routeEdges(edges: JudgeGraphEdge[], nodes: JudgeGraphNode[], positions: Record<string, Vec3>): Record<string, RoutedEdge> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const routes: Record<string, RoutedEdge> = {};
  // Edges between the same pair of nodes never share a lane, so they never coincide.
  const pairLanes = new Map<string, Set<number>>();
  for (const e of edges) {
    const a = positions[e.source];
    const b = positions[e.target];
    const sa = byId.get(e.source);
    const sb = byId.get(e.target);
    if (!a || !b || !sa || !sb) continue;
    const pair = [e.source, e.target].sort().join("|");
    const used = pairLanes.get(pair) ?? new Set<number>();
    pairLanes.set(pair, used);
    // A reversed edge bends the other way for the same lane number, so compare by direction.
    const sign = e.source < e.target ? 1 : -1;
    const ra = NODE_RADIUS[sa.kind] + 0.04;
    const rb = NODE_RADIUS[sb.kind] + 0.04;
    const obstacles = nodes
      .filter((n) => n.id !== e.source && n.id !== e.target && positions[n.id])
      .map((n) => ({ c: positions[n.id], r: NODE_RADIUS[n.kind] + CLEAR }));
    const lanes = LANES.filter((l) => !used.has(l * sign));
    const tried = lanes.map((lane) => {
      const pts = clip(curve(a, b, lane * LANE), a, ra, b, rb);
      return { lane, pts, cost: hits(pts, obstacles) };
    });
    const clean = tried.filter((t) => t.cost === 0 && t.pts.length > 1);
    const best = clean[0] ?? [...tried].sort((x, y) => x.cost - y.cost)[0];
    used.add(best.lane * sign);
    routes[e.id] = {
      edgeId: e.id,
      points: best.pts,
      sourceRadius: ra,
      targetRadius: rb,
      lane: best.lane,
      alternatives: clean.filter((t) => t !== best).slice(0, 4).map((t) => t.pts),
    };
  }
  return routes;
}

export function layoutGraph(g: JudgeGraph, focus?: Slot | null): GraphLayout {
  const positions: Record<string, Vec3> = {};
  const { nodes, edges } = visibleGraph(g, focus ?? undefined);
  const finals = g.decisions.map((d) => g.nodes.find((n) => n.id === `${d.slot}:final`)!).filter(Boolean);
  let active: Set<string>;

  if (!focus) {
    // Left to right: your brief, the four decisions in one column, the final plan.
    positions.brief = [-5.2, 0, 0];
    positions.plan = [5.2, 0, 0];
    finals.forEach((n, i) => {
      positions[n.id] = [0, ((finals.length - 1) / 2 - i) * 1.9, i % 2 ? -0.1 : 0.1];
    });
    active = new Set(nodes.map((n) => n.id));
  } else {
    const own = nodes.filter((n) => n.slot === focus && n.kind !== "final_choice");
    // Columns by replay step; the user's choice and rules share the first.
    const cols = [1, 2, 3, 4, 5].map((step) => own.filter((n) => n.step === step));
    cols.forEach((c, i) => column(c, -6.4 + i * 2.8, positions));
    positions[`${focus}:final`] = [7.8, 0, 0];
    positions.brief = [-9.4, 0, -0.3];
    positions.plan = [10.6, 0, -0.3];
    // The other decisions wait, quieter, beside the plan they belong to.
    finals
      .filter((n) => n.slot !== focus)
      .forEach((n, i, all) => {
        positions[n.id] = [10.6, ((all.length - 1) / 2 - i) * 1.3 + (i < all.length / 2 ? 1.1 : -1.1), -0.6];
      });
    active = new Set([...own.map((n) => n.id), `${focus}:final`]);
  }

  const pts = [...active].map((id) => positions[id]).filter(Boolean);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return {
    positions,
    active,
    // Room on every side for labels, not just the shapes.
    center: [(x0 + x1) / 2, (y0 + y1) / 2, 0],
    size: [x1 - x0 + (focus ? 3.8 : 5.6), y1 - y0 + 3.2],
    routes: routeEdges(edges, nodes, positions),
  };
}
