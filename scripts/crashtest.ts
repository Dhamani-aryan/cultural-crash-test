/**
 * Run one crash test live and print the trace.
 *
 *   npm run live scripts/crashtest.ts              # the London demo brief
 *   npm run live scripts/crashtest.ts -- tokyo     # another example brief by id
 *
 * Writes the full state to research/out/crashtest-<id>.json and the report to
 * research/out/crashtest-<id>.md (git-ignored: Qloo-derived).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createMemoryCache } from "../src/lib/cache/cache";
import { EXAMPLE_BRIEFS } from "../src/lib/crashtest/examples";
import { toMarkdown } from "../src/lib/crashtest/report";
import { runCrashTest } from "../src/lib/crashtest/run";
import { STATUS_LABEL } from "../src/lib/crashtest/types";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { createQlooClient } from "../src/lib/qloo";
import { withCache } from "../src/lib/qloo/cached";

const id = process.argv.slice(2).find((a) => a !== "--") ?? "london";
const example = EXAMPLE_BRIEFS.find((b) => b.id === id);
if (!example) throw new Error(`No example brief "${id}"`);
const qloo = withCache(
  createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} }),
  createMemoryCache(20_000),
);
const started = Date.now();
const state = await runCrashTest({ qloo, llm: getLlm() }, example.brief, {
  emit: (e) => {
    const t = `${((Date.now() - started) / 1000).toFixed(0).padStart(3)}s`;
    if (e.type === "stage") console.log(t, "▸", e.message);
    if (e.type === "action") console.log(t, "  ACTION", e.action.why);
    if (e.type === "change") console.log(t, "  CHANGE", `${e.change.before} → ${e.change.after}`, e.change.reverted ? "(reverted)" : "", "|", e.change.observedEffect);
    if (e.type === "evaluation")
      for (const c of e.evaluation.components)
        console.log(t, `  ${STATUS_LABEL[c.status].padEnd(18)} ${c.slot.padEnd(20)} ${c.label} ${c.total?.toFixed(2) ?? "-"} ${c.coverage} — ${c.finding}`);
  },
});
console.log("\nSTOP", state.stopReason, state.stopDetail ?? "", `| qloo ${state.qlooCallsUsed}, llm ${state.llmCalls}, ${Math.round((Date.now() - started) / 1000)}s`);
console.log("VERDICT", state.verdict);
mkdirSync("research/out", { recursive: true });
writeFileSync(`research/out/crashtest-${id}.json`, JSON.stringify(state, null, 1));
writeFileSync(`research/out/crashtest-${id}.md`, toMarkdown(state));
