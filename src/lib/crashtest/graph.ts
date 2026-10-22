import type { DecisionExplanation, DecisionReasonCode } from "./explain";
import { SLOT_LABEL, type ComponentStatus, type RunState, type Slot } from "./types";

/**
 * The decision graph: the same decisions as the matrix (buildDecisions), laid out as paths
 * from brief inputs through Qloo's tests to the final plan. No new data is read here: every
 * node is a field of a DecisionExplanation or of the brief. Edges mean "was tested against" or
 * "led to the next step", never cause and effect; affinity is labelled as affinity.
 */

/** Node kinds are drawn as different shapes, so colour is never the only signal. */
export type GraphNodeKind = "user" | "qloo" | "app" | "final";

export const NODE_KIND_LABEL: Record<GraphNodeKind, string> = {
  user: "Your input",
  qloo: "Qloo entity or result",
  app: "Application evaluation",
  final: "Final choice",
};

export const GRAPH_COLUMNS = ["Choice tested", "Qloo test", "Decision", "Candidates", "Full-plan re-test", "Final plan"] as const;

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sub?: string;
  status?: ComponentStatus;
  /** Null for the shared brief inputs. */
  lane: Slot | null;
  /** Index into GRAPH_COLUMNS; the shared inputs sit above the column they feed. */
  column: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  lane: Slot;
}

export interface GraphLane {
  slot: Slot;
  title: string;
  changed: boolean;
  /** Spoken summary for the lane's control. */
  summary: string;
}

export interface DecisionGraph {
  inputs: GraphNode[];
  lanes: GraphLane[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const GATE_SUB: Record<DecisionReasonCode, string> = {
  audience_contradiction: "contradicted",
  constraint_conflict: "breaks a rule",
  local_relevance: "not distinctive",
  audience_affinity: "weak audience fit",
  qloo_unknown: "not in Qloo",
  weak_coverage: "thin evidence",
  constraint_locked: "fixed by you",
  user_rule_unverified: "rule needs a human",
  user_choice_kept: "your choice",
  already_supported: "already supported",
  no_better_alternative: "none tested better",
  plan_coherence: "fits the plan",
  venue_fit: "venue fits",
  constraint_safe: "rules held",
};

export const STATUS_SHORT: Record<ComponentStatus, string> = {
  supported: "Supported",
  weak: "Weak",
  no_support: "No support",
  unresolved: "Unverified",
  constraint_conflict: "Conflict",
};

export function buildDecisionGraph(state: RunState, decisions: DecisionExplanation[]): DecisionGraph {
  const brief = state.brief;
  const anchors = state.plan?.anchors ?? state.initialPlan?.anchors ?? [];
  const hard = brief.constraints.filter((c) => c.kind === "hard");
  const locks = hard.filter((c) => c.lockSlot).length;

  const inputs: GraphNode[] = [
    {
      id: "in:anchors",
      kind: brief.audienceAnchors.length ? "user" : "qloo",
      label: "Audience anchors",
      sub: anchors.length ? anchors.map((a) => a.name).join(", ") : "none resolved",
      lane: null,
      column: 0,
    },
    { id: "in:market", kind: "user", label: "Market", sub: state.marketLabel, lane: null, column: 1 },
  ];
  if (hard.length)
    inputs.push({
      id: "in:rules",
      kind: "user",
      label: "Your rules",
      sub: [locks && `${locks} fixed`, hard.length - locks && `${hard.length - locks} other`].filter(Boolean).join(" · "),
      lane: null,
      column: 2,
    });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const lanes: GraphLane[] = [];

  for (const d of decisions) {
    const lane = d.slot;
    const id = (s: string) => `${lane}:${s}`;
    const tested = d.alternatives.length + (d.changed ? 1 : 0);
    nodes.push(
      {
        id: id("original"),
        kind: d.baseline.origin === "user_provided" ? "user" : "qloo",
        label: d.baseline.label,
        sub: d.baseline.origin === "user_provided" ? "From your brief" : "Added by LLM",
        lane,
        column: 0,
      },
      { id: id("test"), kind: "qloo", label: d.baselineSignal, sub: STATUS_SHORT[d.baseline.status], status: d.baseline.status, lane, column: 1 },
      {
        id: id("gate"),
        kind: "app",
        label: d.changed ? "Opened" : d.userChoice?.locked ? "Locked" : "Kept",
        sub: GATE_SUB[d.reasonCodes[0]],
        lane,
        column: 2,
      },
    );
    edges.push(
      { from: id("original"), to: id("test"), label: "tested", lane },
      { from: "in:anchors", to: id("test"), label: "affinity", lane },
      { from: "in:market", to: id("test"), label: "local relevance", lane },
      { from: id("test"), to: id("gate"), lane },
    );
    if (hard.length) edges.push({ from: "in:rules", to: id("gate"), label: d.userChoice?.locked ? "locked" : "allowed", lane });

    if (tested) {
      nodes.push(
        {
          id: id("candidates"),
          kind: "qloo",
          label: `${tested} tested`,
          sub: d.changed ? `${d.revised.label} kept` : "none kept",
          lane,
          column: 3,
        },
        {
          id: id("retest"),
          kind: "app",
          label: "Re-tested",
          sub: d.changed ? `${STATUS_SHORT[d.baseline.status]} → ${STATUS_SHORT[d.revised.status]}` : "no improvement",
          lane,
          column: 4,
        },
      );
      edges.push(
        { from: id("gate"), to: id("candidates"), label: "search", lane },
        { from: id("candidates"), to: id("retest"), label: "full plan", lane },
        { from: id("retest"), to: id("final"), label: d.changed ? "kept" : "original kept", lane },
      );
    } else {
      edges.push({ from: id("gate"), to: id("final"), label: "unchanged", lane });
    }
    nodes.push({
      id: id("final"),
      kind: "final",
      label: d.revised.label,
      sub: `${d.changed ? "Changed" : "Retained"} · ${STATUS_SHORT[d.revised.status]}`,
      status: d.revised.status,
      lane,
      column: 5,
    });
    lanes.push({
      slot: lane,
      title: SLOT_LABEL[lane],
      changed: d.changed,
      summary: d.changed
        ? `${SLOT_LABEL[lane]}: ${d.baseline.label} changed to ${d.revised.label}. ${d.summaryReason}.`
        : `${SLOT_LABEL[lane]}: ${d.revised.label} retained. ${d.summaryReason}.`,
    });
  }
  return { inputs, lanes, nodes, edges };
}
