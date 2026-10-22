/**
 * Run the plausibility cases and record each outcome for a person to grade.
 *
 *   EVAL_TAG=v1 npm run eval:plausibility
 *
 * Writes eval/out/plausibility-<tag>.json (git-ignored: Qloo-derived). Each row has a `review`
 * slot that stays null until a person fills it with { verdict, reason, reviewer }. Nothing here
 * grades plausibility automatically; it only reports whether the expectation (keep / replace)
 * held and whether the choice was flagged for a human.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createMemoryCache } from "../src/lib/cache/cache";
import { runCrashTest } from "../src/lib/crashtest/run";
import { SLOT_LABEL } from "../src/lib/crashtest/types";
import { rankingFrom, RUN_VERSION } from "../src/lib/crashtest/version";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { createQlooClient } from "../src/lib/qloo";
import { withCache } from "../src/lib/qloo/cached";
import { PLAUSIBILITY, type PlausibilityReview } from "./plausibility";

export interface PlausibilityRow {
  id: string;
  reviewed: boolean;
  expect: "keep" | "replace_ok";
  original: string | null;
  final: string | null;
  changed: boolean;
  /** "keep" cases: the original survived. "replace_ok" cases: always true (credibility is graded by hand). */
  expectationHeld: boolean;
  flagged: boolean;
  status: string | null;
  review: PlausibilityReview | null;
  error: string | null;
}

const tag = process.env.EVAL_TAG ?? rankingFrom();
const file = `eval/out/plausibility-${tag}.json`;
// Keep any reviews already written into this file by hand.
const previous: PlausibilityRow[] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).rows : [];
const llm = getLlm();
const qloo = withCache(createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} }), createMemoryCache(20_000));
const rows: PlausibilityRow[] = [];

for (const c of PLAUSIBILITY) {
  process.stdout.write(`${c.id} … `);
  const kept = previous.find((r) => r.id === c.id)?.review ?? null;
  try {
    const s = await runCrashTest({ qloo, llm }, c.brief, { runVersion: RUN_VERSION });
    const before = s.initialPlan?.components.find((x) => x.slot === c.slot);
    const after = s.plan?.components.find((x) => x.slot === c.slot);
    const changed = !!before && !!after && before.label !== after.label;
    const flagged = s.unresolvedQuestions.some((q) => q.startsWith(SLOT_LABEL[c.slot]));
    rows.push({
      id: c.id,
      reviewed: c.reviewed,
      expect: c.expect,
      original: before?.label ?? null,
      final: after?.label ?? null,
      changed,
      expectationHeld: c.expect === "keep" ? !changed : true,
      flagged,
      status: s.evaluations.at(-1)?.components.find((x) => x.slot === c.slot)?.status ?? null,
      review: kept,
      error: null,
    });
    console.log(`${before?.label} → ${after?.label}${flagged ? " (flagged)" : ""}`);
  } catch (err) {
    rows.push({ id: c.id, reviewed: c.reviewed, expect: c.expect, original: null, final: null, changed: false, expectationHeld: false, flagged: false, status: null, review: kept, error: String(err) });
    console.log(`ERROR ${err}`);
  }
}

mkdirSync("eval/out", { recursive: true });
writeFileSync(file, JSON.stringify({ ranAt: new Date().toISOString(), runVersion: RUN_VERSION, ranking: rankingFrom(), rows }, null, 2));
console.log(`wrote ${file}`);
