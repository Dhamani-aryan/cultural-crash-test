import { visibleGraph, type JudgeGraph, type JudgeGraphNode } from "./judge-graph";
import type { Slot } from "./types";

/**
 * Where each graph node sits, computed from the graph alone: same run, same picture. The
 * overview puts the final plan in the centre with its four decisions around it and the brief above. A focused decision
 * spreads its path into columns by replay step, while the other decisions recede behind it.
 */

export type Vec3 = [number, number, number];

export interface GraphLayout {
  positions: Record<string, Vec3>;
  /** Nodes on the path being looked at; everything else recedes. */
  active: Set<string>;
  /** Centre and size of the active nodes, for fitting the camera. */
  center: Vec3;
  size: [number, number];
}

const SPACING = 1.5;

function column(nodes: JudgeGraphNode[], x: number, out: Record<string, Vec3>) {
  nodes.forEach((n, i) => {
    const y = ((nodes.length - 1) / 2 - i) * SPACING;
    // A slight alternating depth gives the column some parallax without breaking alignment.
    out[n.id] = [x, y, i % 2 ? -0.3 : 0.3];
  });
}

export function layoutGraph(g: JudgeGraph, focus?: Slot | null): GraphLayout {
  const positions: Record<string, Vec3> = {};
  const { nodes } = visibleGraph(g, focus ?? undefined);
  const finals = g.nodes.filter((n) => n.kind === "final_choice");
  let active: Set<string>;

  if (!focus) {
    // The final plan in the centre with its four decisions around it, and the brief off to the
    // left and slightly behind, so every brief → decision line clears the plan instead of crossing it.
    positions.plan = [0.8, 0, 0];
    positions.brief = [-6.2, 0, -1.2];
    const corners: Vec3[] = [
      [-2.4, 1.7, 0.4],
      [3.6, 1.7, -0.4],
      [-2.4, -1.7, -0.4],
      [3.6, -1.7, 0.4],
    ];
    finals.forEach((n, i) => {
      positions[n.id] = corners[i] ?? [0, -3 - i, 0];
    });
    active = new Set(nodes.map((n) => n.id));
  } else {
    const own = nodes.filter((n) => n.slot === focus && n.kind !== "final_choice");
    // Columns by replay step; the user's choice and rules share the first.
    const cols = [1, 2, 3, 4, 5].map((step) => own.filter((n) => n.step === step));
    cols.forEach((c, i) => column(c, -6.4 + i * 2.8, positions));
    positions[`${focus}:final`] = [7.8, 0, 0];
    positions.brief = [-9.4, 0, -1.5];
    positions.plan = [10.6, 0, -1.5];
    // The other decisions wait, quieter and further back, beside the plan they belong to.
    finals
      .filter((n) => n.slot !== focus)
      .forEach((n, i, all) => {
        positions[n.id] = [10.6, ((all.length - 1) / 2 - i) * 1.3 + (i < all.length / 2 ? 1.1 : -1.1), -3.5];
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
    // Extra room below keeps the lowest labels clear of the legend along the canvas's bottom edge.
    center: [(x0 + x1) / 2, (y0 + y1) / 2 - 0.6, 0],
    size: [x1 - x0 + 3.8, y1 - y0 + 3.2],
  };
}
