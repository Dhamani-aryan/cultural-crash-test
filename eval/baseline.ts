import { existsSync, readFileSync } from "node:fs";
import type { CulturalPlan, EntityRef, LaunchBrief } from "../src/lib/crashtest/types";

/**
 * A frozen evaluation baseline: each brief's starting point saved once, so two agent versions can
 * be compared from identical plans instead of fresh, different LLM drafts.
 *
 * Baselines hold Qloo-derived entity names and IDs, so they live in the git-ignored eval/out/
 * (Qloo's terms forbid committing its responses). Creating one is deliberate: the freeze script
 * needs an explicit BASELINE_ID and refuses to overwrite an existing file.
 */
export interface BaselineCase {
  id: string;
  /** The brief after validation (defaults filled in). */
  brief: LaunchBrief;
  /** The LLM's first plan, already resolved in Qloo: anchors and the four choices. */
  initialPlan: CulturalPlan;
  /** What the draft and resolution steps noted. */
  assumptions: string[];
  /** Held-out anchors and spares as resolved when frozen; null when Qloo couldn't find one. */
  heldOut: { name: string; ref: EntityRef | null }[];
  /** Spares come after the case's own held-out anchors in `heldOut`. */
  heldOutCount: number;
}

export interface Baseline {
  id: string;
  createdAt: string;
  /** The model that drafted the plans. */
  model: string;
  /** The agent version whose draft and resolution prompts produced them. */
  runVersion: string;
  cases: BaselineCase[];
}

export const baselinePath = (id: string) => `eval/out/baselines/${id}.json`;

export function loadBaseline(id: string): Baseline {
  const path = baselinePath(id);
  if (!existsSync(path)) throw new Error(`No baseline "${id}" at ${path}. Create one with BASELINE_ID=${id} npm run eval:freeze.`);
  return JSON.parse(readFileSync(path, "utf8")) as Baseline;
}
