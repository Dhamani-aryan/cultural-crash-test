/**
 * Print the first evaluation and every repair decision for some eval briefs, to see why a
 * choice was judged contradicted and what replaced it.
 *
 *   npm run live scripts/diagnose.ts -- mumbai-sneakers tokyo-skincare
 */
import { createMemoryCache } from "../src/lib/cache/cache";
import { runCrashTest } from "../src/lib/crashtest/run";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { createQlooClient } from "../src/lib/qloo";
import { withCache } from "../src/lib/qloo/cached";
import { CASES } from "../eval/cases";

const ids = process.argv.slice(2).filter((a) => a !== "--");
const qloo = withCache(
  createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} }),
  createMemoryCache(20_000),
);
for (const c of CASES.filter((x) => ids.includes(x.id))) {
  const s = await runCrashTest({ qloo, llm: getLlm() }, c.brief);
  console.log(`\n=== ${c.id}  anchors: ${s.plan?.anchors.map((a) => a.name).join(", ")}`);
  for (const a of s.evaluations[0]?.components ?? []) {
    console.log(`  ${a.slot.padEnd(20)} ${a.label} — ${a.status}${a.contradicted ? " CONTRADICTED" : ""}`);
    for (const d of a.dimensions) console.log(`      ${d.key}: ${d.score?.toFixed(2) ?? "-"} ${d.explanation}`);
  }
  for (const a of s.actions) console.log(`  ACTION r${a.iteration} ${a.slot}: ${a.why.slice(0, 160)}`);
  for (const ch of s.changes) console.log(`  CHANGE r${ch.iteration} ${ch.before} → ${ch.after}${ch.reverted ? " (not kept)" : ""}: ${ch.observedEffect}`);
  for (const r of s.evidenceLedger.filter((x) => /candidates|suggestions|judged/.test(x.purpose)))
    console.log(`  ${r.evidenceId} ${r.purpose} | ${r.results.slice(0, 8).map((x) => x.name).join(", ")} | ${r.warnings.join(" ")}`);
  console.log("  STOP", s.stopReason, s.stopDetail ?? "");
  console.log("  OPEN", s.unresolvedQuestions);
}
