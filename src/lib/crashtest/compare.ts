import { MATERIAL_DELTA } from "./evaluate";
import {
  RUBRIC_VERSION,
  SLOT_LABEL,
  STATUS_LABEL,
  type ComponentAssessment,
  type ComponentStatus,
  type PlanEvaluation,
  type RunState,
  type Slot,
} from "./types";

/**
 * LLM-only plan vs agent plan, decided by code from the two recorded evaluations. No model is
 * involved: the outcome can be the agent, the baseline, mixed, the same plan, or not enough
 * evidence to say. Priority: hard constraints, then fewer contradicted choices, then more
 * supported choices, then evidence coverage, and the app-defined score only last.
 */

export type ComparisonOutcome = "agent" | "baseline" | "mixed" | "insufficient_evidence" | "same";

export const OUTCOME_LABEL: Record<ComparisonOutcome, string> = {
  agent: "Agent plan better supported by Qloo evidence",
  baseline: "LLM-only plan better supported by Qloo evidence",
  mixed: "Mixed: each plan is better supported on different choices",
  insufficient_evidence: "Not enough Qloo evidence to compare",
  same: "Same choice in both plans",
};

export interface ComponentComparison {
  slot: Slot;
  baselineChoice: string;
  agentChoice: string;
  outcome: ComparisonOutcome;
  reasons: string[];
  evidenceIds: string[];
}

export interface PlanComparison {
  rubricVersion: string;
  outcome: ComparisonOutcome;
  headline: string;
  /** Which rule decided the overall outcome. */
  decidedBy: "hard_constraints" | "contradicted" | "supported" | "coverage" | "score" | "none";
  componentComparisons: ComponentComparison[];
  scoreDelta?: number;
  supportedDelta: number;
  contradictedDelta: number;
  coverageCaveat: string;
}

const STATUS_RANK: Record<ComponentStatus, number> = {
  constraint_conflict: 0,
  no_support: 1,
  unresolved: 1,
  weak: 2,
  supported: 3,
};
const COVERAGE_RANK = { insufficient: 0, partial: 1, adequate: 2 } as const;

/** Higher is better: compliance, not contradicted, status, coverage, score. */
function rankOf(a: ComponentAssessment): number[] {
  return [
    a.status === "constraint_conflict" ? 0 : 1,
    a.contradicted ? 0 : 1,
    STATUS_RANK[a.status],
    COVERAGE_RANK[a.coverage],
    a.total ?? 0,
  ];
}

function cmp(x: number[], y: number[]): number {
  for (let i = 0; i < x.length; i++) {
    const d = i === x.length - 1 ? (Math.abs(x[i] - y[i]) < MATERIAL_DELTA ? 0 : x[i] - y[i]) : x[i] - y[i];
    if (d !== 0) return d;
  }
  return 0;
}

const hasEvidence = (a: ComponentAssessment) => a.status !== "unresolved" && a.dimensions.some((d) => d.score !== undefined);

function describe(a: ComponentAssessment): string {
  return `${a.label}: ${STATUS_LABEL[a.status]}${a.contradicted ? " (contradicted by the evidence)" : ""}. ${a.finding}`;
}

function compareComponent(b: ComponentAssessment, a: ComponentAssessment, ids: Set<string>): ComponentComparison {
  const evidenceIds = [...new Set([...b.dimensions, ...a.dimensions].flatMap((d) => d.evidenceIds))].filter((id) => ids.has(id));
  const base = { slot: a.slot, baselineChoice: b.label, agentChoice: a.label, evidenceIds };
  if (b.label === a.label) return { ...base, outcome: "same", reasons: [`Kept. ${describe(a)}`] };
  if (!hasEvidence(b) && !hasEvidence(a))
    return { ...base, outcome: "insufficient_evidence", reasons: [describe(b), describe(a), "Neither choice could be tested in Qloo."] };
  const d = cmp(rankOf(a), rankOf(b));
  const reasons = [`LLM alone: ${describe(b)}`, `Agent: ${describe(a)}`];
  if (!hasEvidence(b) && hasEvidence(a)) reasons.push(`Qloo had no evidence for ${b.label}; ${a.label} could be tested.`);
  return { ...base, outcome: d > 0 ? "agent" : d < 0 ? "baseline" : "mixed", reasons };
}

const count = (e: PlanEvaluation, f: (c: ComponentAssessment) => boolean) => e.components.filter(f).length;

export function comparePlans(state: RunState): PlanComparison | null {
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!first || !last) return null;
  const ids = new Set(state.evidenceLedger.map((r) => r.evidenceId));
  const componentComparisons = last.components.map((a) =>
    compareComponent(first.components.find((x) => x.slot === a.slot)!, a, ids),
  );

  const supportedDelta = last.supported - first.supported;
  const contradictedDelta = count(last, (c) => c.contradicted) - count(first, (c) => c.contradicted);
  const scoreDelta =
    last.totalScore !== undefined && first.totalScore !== undefined ? last.totalScore - first.totalScore : undefined;
  const coverageDelta = count(last, (c) => c.coverage === "adequate") - count(first, (c) => c.coverage === "adequate");
  const violations = last.hardConstraintViolations.length - first.hardConstraintViolations.length;

  let outcome: ComparisonOutcome;
  let decidedBy: PlanComparison["decidedBy"];
  if (componentComparisons.every((c) => c.outcome === "same")) {
    outcome = "same";
    decidedBy = "none";
  } else if (first.scored < 2 && last.scored < 2) {
    outcome = "insufficient_evidence";
    decidedBy = "none";
  } else if (violations !== 0) {
    outcome = violations < 0 ? "agent" : "baseline";
    decidedBy = "hard_constraints";
  } else if (contradictedDelta !== 0) {
    outcome = contradictedDelta < 0 ? "agent" : "baseline";
    decidedBy = "contradicted";
  } else if (supportedDelta !== 0) {
    outcome = supportedDelta > 0 ? "agent" : "baseline";
    decidedBy = "supported";
  } else if (coverageDelta !== 0) {
    outcome = coverageDelta > 0 ? "agent" : "baseline";
    decidedBy = "coverage";
  } else if (scoreDelta !== undefined && Math.abs(scoreDelta) >= MATERIAL_DELTA) {
    outcome = scoreDelta > 0 ? "agent" : "baseline";
    decidedBy = "score";
  } else {
    const wins = componentComparisons.filter((c) => c.outcome === "agent").length;
    const losses = componentComparisons.filter((c) => c.outcome === "baseline").length;
    outcome = wins || losses ? "mixed" : "insufficient_evidence";
    decidedBy = "none";
  }

  const losses = componentComparisons.filter((c) => c.outcome === "baseline").map((c) => SLOT_LABEL[c.slot].toLowerCase());
  const why: Record<PlanComparison["decidedBy"], string> = {
    hard_constraints: "it breaks fewer hard constraints",
    contradicted: `it has ${Math.abs(contradictedDelta)} fewer choice${Math.abs(contradictedDelta) === 1 ? "" : "s"} the evidence contradicts`,
    supported: `it has ${Math.abs(supportedDelta)} more supported choice${Math.abs(supportedDelta) === 1 ? "" : "s"}`,
    coverage: "more of its choices have adequate evidence",
    score: "its app-defined score is materially higher",
    none: "",
  };
  const headline =
    outcome === "same"
      ? "The agent kept the LLM-only plan: nothing in it was contradicted and no better-supported upgrade was found."
      : outcome === "insufficient_evidence"
        ? "There isn't enough Qloo evidence to say which plan is better supported."
        : outcome === "mixed"
          ? "Mixed: each plan is better supported on different choices, and overall they're level."
          : `${outcome === "agent" ? "The agent's plan" : "The LLM-only plan"} is better supported by Qloo evidence: ${why[decidedBy]}.` +
            (outcome === "agent" && losses.length ? ` The LLM's pick was better supported for the ${losses.join(" and ")}.` : "");

  const thin = last.components.filter((c) => c.status === "unresolved" || c.coverage !== "adequate");
  const coverageCaveat = thin.length
    ? `${thin.length} of the agent's ${last.components.length} final choices have partial or no Qloo evidence (${thin.map((c) => c.label).join(", ")}). Treat those as hypotheses.`
    : "Every final choice has adequate Qloo evidence. Scores are the app's own and not a forecast.";

  return {
    rubricVersion: RUBRIC_VERSION,
    outcome,
    headline,
    decidedBy,
    componentComparisons,
    scoreDelta,
    supportedDelta,
    contradictedDelta,
    coverageCaveat,
  };
}
