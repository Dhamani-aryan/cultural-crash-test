import { z } from "zod";

/**
 * Domain types for a crash-test run. The whole decision history lives in one `RunState`:
 * the report and the UI are rendered from it, never reconstructed from model text.
 */

export const SLOTS = ["artist_music", "brand_collaboration", "event_place", "creative_direction"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABEL: Record<Slot, string> = {
  artist_music: "Music act",
  brand_collaboration: "Collaboration brand",
  event_place: "Pop-up venue",
  creative_direction: "Creative direction",
};

/** The Qloo entity type behind each entity slot. Creative direction is tested through tags. */
export const SLOT_TYPE: Record<Exclude<Slot, "creative_direction">, string> = {
  artist_music: "urn:entity:artist",
  brand_collaboration: "urn:entity:brand",
  event_place: "urn:entity:place",
};

export const DEPTHS = {
  quick: { maxRepairs: 3, maxQlooCalls: 700 },
  thorough: { maxRepairs: 6, maxQlooCalls: 1400 },
} as const;
export type Depth = keyof typeof DEPTHS;

export const ConstraintSchema = z.object({
  id: z.string(),
  description: z.string().trim().min(1).max(300),
  kind: z.enum(["hard", "soft"]),
  /** Machine-checked forms. A hard constraint without one is shown as not machine-checked. */
  lockSlot: z.enum(SLOTS).optional(),
  excludeNames: z.array(z.string().trim().min(1)).max(10).optional(),
});
export type Constraint = z.infer<typeof ConstraintSchema>;

export const LaunchBriefSchema = z.object({
  brandName: z.string().trim().max(80).optional(),
  productCategory: z.string().trim().min(2).max(120),
  launchGoal: z.string().trim().min(2).max(200),
  /** One of the supported market ids (src/lib/markets.ts). */
  marketId: z.string(),
  audienceDescription: z.string().trim().min(3).max(400),
  /** Names of brands or artists that stand for the audience. Optional: the agent proposes them. */
  audienceAnchors: z.array(z.string().trim().min(1)).max(4).default([]),
  brandAttributes: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  budgetBand: z.string().trim().max(60).optional(),
  existingChoices: z
    .array(z.object({ slot: z.enum(SLOTS), name: z.string().trim().min(1).max(120) }))
    .max(4)
    .default([]),
  constraints: z.array(ConstraintSchema).max(8).default([]),
  depth: z.enum(["quick", "thorough"]).default("quick"),
});
export type LaunchBrief = z.infer<typeof LaunchBriefSchema>;
export type LaunchBriefInput = z.input<typeof LaunchBriefSchema>;

/** The parts of a Qloo entity a plan keeps. */
export interface EntityRef {
  id: string;
  name: string;
  type: string | null;
  popularity: number | null;
  imageUrl: string | null;
  shortDescription: string | null;
}

export interface TagRef {
  id: string;
  name: string;
}

export interface Component {
  slot: Slot;
  /** What the plan calls it: the entity name, or the creative direction keywords. */
  label: string;
  origin: "user_provided" | "agent_proposed" | "agent_repair";
  locked: boolean;
  resolution: "resolved" | "ambiguous" | "not_found";
  entity: EntityRef | null;
  /** Creative direction only: the Qloo tags the direction was mapped to. */
  tags: TagRef[];
  /** For a pop-up venue: the place category it was tested in. */
  placeCategory: string | null;
}

export interface CulturalPlan {
  anchors: EntityRef[];
  components: Component[];
}

// ---------- evidence ----------

export type Coverage = "usable" | "partial" | "empty" | "error";

export interface EvidenceItem {
  id: string;
  name: string;
  type?: string;
  rank?: number;
  affinity?: number;
  popularity?: number;
  /** Anchor or component ID → contribution, from Qloo's explainability. */
  explainability?: Record<string, number>;
}

export interface EvidenceRecord {
  evidenceId: string;
  iteration: number;
  purpose: string;
  queryKind: "search" | "entities" | "tags" | "insights" | "locality";
  /** Parameters as sent, minus anything secret. Enough to reproduce the query. */
  sanitizedRequest: Record<string, unknown>;
  qlooEntityIds: string[];
  /** Top results only (the ledger is shown to people), with the queried item if present. */
  results: EvidenceItem[];
  /** How many results Qloo returned in total. */
  resultCount: number;
  coverageStatus: Coverage;
  warnings: string[];
  collectedAt: string;
}

// ---------- evaluation ----------

export const RUBRIC_VERSION = "crash-v1";
export const DIMENSIONS = ["audience", "local", "coherence", "distinct"] as const;
export type DimensionKey = (typeof DIMENSIONS)[number];
export const WEIGHTS: Record<DimensionKey, number> = {
  audience: 0.35,
  local: 0.3,
  coherence: 0.25,
  distinct: 0.1,
};
export const DIMENSION_LABEL: Record<DimensionKey, string> = {
  audience: "Audience affinity",
  local: "Local relevance",
  coherence: "Package coherence",
  distinct: "Distinctness",
};

export interface DimensionScore {
  key: DimensionKey;
  /** Undefined when there is no evidence; missing is never turned into 0. */
  score?: number;
  weight: number;
  evidenceIds: string[];
  explanation: string;
  /** Distinctness is our own heuristic, not a Qloo measure. */
  heuristic?: boolean;
}

export type ComponentStatus =
  | "supported"
  | "weak"
  | "no_support"
  | "unresolved"
  | "constraint_conflict";

export const STATUS_LABEL: Record<ComponentStatus, string> = {
  supported: "Supported",
  weak: "Weak evidence",
  no_support: "No support found",
  unresolved: "Unresolved",
  constraint_conflict: "Constraint conflict",
};

export interface ComponentAssessment {
  slot: Slot;
  label: string;
  status: ComponentStatus;
  total?: number;
  coverage: "adequate" | "partial" | "insufficient";
  dimensions: DimensionScore[];
  /** One line on the main reason for the status. */
  finding: string;
}

export interface PlanEvaluation {
  iteration: number;
  rubricVersion: string;
  /** Mean score of the components that have one. Read it with `supported` and `scored`. */
  totalScore?: number;
  /** Components that are Supported, out of all components. */
  supported: number;
  /** Components with a score at all (no-support and unresolved ones have none). */
  scored: number;
  components: ComponentAssessment[];
  hardConstraintViolations: string[];
  /** Weakest unlocked component first; empty when nothing can be improved. */
  weakest: Slot[];
  accepted: boolean;
  materialImprovementFromPrevious?: number;
}

// ---------- changes and run ----------

export interface PlanChange {
  iteration: number;
  slot: Slot;
  before: string;
  after: string;
  reason: string;
  triggeringEvidenceIds: string[];
  expectedEffect: string;
  observedEffect?: string;
  /** Set when the candidate was tested but not kept (worse, or another candidate tested better). */
  reverted?: boolean;
}

export type StopReason =
  | "acceptance_criteria_met"
  | "no_material_improvement"
  | "iteration_limit"
  | "api_budget_limit"
  | "insufficient_data"
  | "user_cancelled"
  | "error";

export const STOP_LABEL: Record<StopReason, string> = {
  acceptance_criteria_met: "Every adjustable choice is supported",
  no_material_improvement: "Further repairs stopped improving the plan",
  iteration_limit: "Reached the repair-round limit",
  api_budget_limit: "Reached the Qloo call budget",
  insufficient_data: "Qloo has too little data to test this plan",
  user_cancelled: "Cancelled",
  error: "Stopped by an error",
};

export interface ActionRecord {
  iteration: number;
  kind: "find_alternatives" | "re_resolve" | "retest_direction";
  slot: Slot;
  why: string;
}

export interface RunState {
  runId: string;
  brief: LaunchBrief;
  marketLabel: string;
  initialPlan: CulturalPlan | null;
  plan: CulturalPlan | null;
  assumptions: string[];
  currentIteration: number;
  maxIterations: number;
  maxQlooCalls: number;
  qlooCallsUsed: number;
  llmCalls: number;
  evidenceLedger: EvidenceRecord[];
  evaluations: PlanEvaluation[];
  actions: ActionRecord[];
  changes: PlanChange[];
  unresolvedQuestions: string[];
  /** Names the agent tried and Qloo ruled out, per slot, so they aren't retried. */
  rejected: Partial<Record<Slot, string[]>>;
  stopReason?: StopReason;
  stopDetail?: string;
  /** The model's short verdict, written only from the recorded state. */
  verdict?: string;
  startedAt: string;
  finishedAt?: string;
}

export type RunEvent =
  | { type: "stage"; stage: string; message: string }
  | { type: "evidence"; record: EvidenceRecord }
  | { type: "plan"; plan: CulturalPlan; label: "initial" | "revised" }
  | { type: "evaluation"; evaluation: PlanEvaluation }
  | { type: "action"; action: ActionRecord }
  | { type: "change"; change: PlanChange }
  | { type: "budget"; qlooCallsUsed: number; maxQlooCalls: number }
  | { type: "done"; state: RunState }
  | { type: "error"; message: string };
