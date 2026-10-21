import type { Equivalent } from "@/lib/engine/equivalents";
import type { Confidence, Domain } from "@/lib/markets";
import type { QlooEntity } from "@/lib/qloo";

/** A cultural reference the extractor found in the text. */
export interface Reference {
  /** Stable ref used in prompts and the UI: R1, R2… */
  ref: string;
  /** The exact span in the original text. */
  surface: string;
  /** The entity name to look up (e.g. "Chipotle" for "your Chipotle habit"). */
  name: string;
  /** The extractor's guess at the kind of thing it is. */
  kind: Domain | "other";
  /** What the reference does in the sentence, e.g. "shorthand for cheap, fast, healthy-ish lunch". */
  job: string;
}

export interface ResolvedReference extends Reference {
  /** Null when Qloo has no matching entity; such references are flagged, never guessed. */
  entity: QlooEntity | null;
  domain: Domain | null;
  /** Why resolution failed or which match was chosen among several. */
  note: string | null;
}

export type Action = "swap" | "keep" | "flag";

/** What the agent decided for one reference in one market. */
export interface Decision {
  ref: string;
  action: Action;
  /** The chosen local equivalent (swap only). */
  choice: Equivalent | null;
  /** Other candidates the user can swap in instead. */
  alternatives: Equivalent[];
  domain: Domain | null;
  confidence: Confidence | null;
  reason: string;
  /** Set when the agent searched another kind of culture for a better fit. */
  triedDomain: Domain | null;
  /** The agent's own suggestions that Qloo's checks turned down, and why. */
  dropped: { name: string; reason: string }[];
}

export interface Replacement {
  ref: string;
  original: string;
  replacement: string;
}

export interface MarketResult {
  marketId: string;
  text: string;
  decisions: Decision[];
  replacements: Replacement[];
  /** Proper nouns the guard removed or could not verify. Empty in a clean run. */
  guardIssues: string[];
  note: string | null;
}

/** The same model asked to localize without Qloo, for the side-by-side comparison. */
export interface BaselineResult {
  marketId: string;
  text: string;
  swaps: {
    original: string;
    replacement: string;
    /** What the model said the replacement is. */
    kind: Domain;
    /**
     * What Qloo says about the model's pick: unknown to Qloo, of foreign origin, in the city's
     * own taste lists (local evidence), or known to Qloo but not distinctive in that city.
     */
    check: "not_in_qloo" | "foreign" | "local_evidence" | "no_local_evidence";
  }[];
}

export interface TranscreateResult {
  original: string;
  references: ResolvedReference[];
  markets: MarketResult[];
  baseline: BaselineResult[];
  stats: { qlooCalls: number; llmCalls: number; ms: number };
}

export type AgentEvent =
  | { type: "stage"; stage: string; message: string }
  | { type: "references"; references: ResolvedReference[] }
  | { type: "decision"; marketId: string; decision: Decision }
  | { type: "market"; result: MarketResult }
  | { type: "baseline"; result: BaselineResult[] }
  | { type: "done"; result: TranscreateResult }
  | { type: "error"; message: string };
