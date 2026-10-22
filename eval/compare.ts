/**
 * Compare two evaluation runs (A = current agent, B = experiment) and apply the merge gates.
 *
 *   EVAL_A=frozen-b1-v1 EVAL_B=frozen-b1-v2 npm run eval:compare
 *
 * Both runs should start from the same frozen baseline. Prints the side-by-side summary and each
 * gate's result; the decision is "merge B" only when every gate passes. Plausibility counts only
 * cases a person has reviewed (see eval/plausibility.ts).
 */
import { existsSync, readFileSync } from "node:fs";
import { PLAUSIBILITY } from "./plausibility";
import type { PlausibilityRow } from "./plausibility-run";
import type { CaseRow } from "./run";
import { gates, summarize, summaryRows } from "./summary";

interface RunFile {
  ranAt: string;
  runVersion?: string;
  ranking?: string;
  frozen?: string | null;
  cases: CaseRow[];
}
const load = (tag: string) => JSON.parse(readFileSync(`eval/out/results-${tag}.json`, "utf8")) as RunFile;
const A_TAG = process.env.EVAL_A;
const B_TAG = process.env.EVAL_B;
if (!A_TAG || !B_TAG) throw new Error("Set EVAL_A and EVAL_B to two result tags.");
const a = load(A_TAG);
const b = load(B_TAG);

/** Reviewed plausibility cases a person graded implausible in a given run's plausibility file. */
function implausible(tag: string | undefined): number | null {
  const file = tag ? `eval/out/plausibility-${tag}.json` : null;
  if (!file || !existsSync(file)) return null;
  const rows = (JSON.parse(readFileSync(file, "utf8")) as { rows: PlausibilityRow[] }).rows;
  const reviewed = new Set(PLAUSIBILITY.filter((c) => c.reviewed).map((c) => c.id));
  return rows.filter((r) => reviewed.has(r.id) && r.review?.verdict === "implausible").length;
}

const sa = summarize(a.cases);
const sb = summarize(b.cases);
if (a.frozen !== b.frozen || !a.frozen) console.warn(`Warning: runs are not from the same frozen baseline (A: ${a.frozen ?? "live"}, B: ${b.frozen ?? "live"}).`);
console.log(`| Measure | A: ${A_TAG} (${a.ranking ?? "v1"}) | B: ${B_TAG} (${b.ranking ?? "v1"}) |`);
console.log("|---|---|---|");
const ra = summaryRows(sa);
const rb = summaryRows(sb);
ra.forEach(([k, v], i) => console.log(`| ${k} | ${v} | ${rb[i][1]} |`));
console.log("");
const reviewed = PLAUSIBILITY.filter((c) => c.reviewed).length;
const gs = gates(sa, sb, implausible(process.env.PLAUSIBILITY_B), reviewed);
for (const g of gs) console.log(`- ${g.pass === null ? "–" : g.pass ? "PASS" : "FAIL"} ${g.name}: ${g.detail}`);
const failed = gs.filter((g) => g.pass === false);
console.log("");
console.log(failed.length ? `Decision: keep A (${failed.length} gate(s) failed).` : "Decision: every active gate passed; B may be merged.");
