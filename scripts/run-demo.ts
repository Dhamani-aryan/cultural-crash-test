/**
 * Runs the full agent live on the demo texts and prints what it decided. Output goes to the
 * console only (Qloo terms: no stored responses).
 *
 *   npm run live scripts/run-demo.ts            # all demo texts
 *   npm run live scripts/run-demo.ts -- ad      # one demo by id
 */
import { runTranscreate } from "../src/lib/agent/orchestrator";
import { EXAMPLES } from "../src/components/examples";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { createQlooClient } from "../src/lib/qloo";
import { withCache } from "../src/lib/qloo/cached";
import { createMemoryCache } from "../src/lib/cache/cache";

const only = process.argv.slice(2).filter((a) => a !== "--");
const qloo = withCache(
  createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} }),
  createMemoryCache(5000),
);
const llm = getLlm();

for (const ex of EXAMPLES.filter((e) => only.length === 0 || only.includes(e.id))) {
  console.log(`\n================ ${ex.label} → ${ex.markets.join(", ")}\n${ex.text}`);
  const result = await runTranscreate(
    { qloo, llm },
    { text: ex.text, marketIds: [...ex.markets] },
    (e) => {
      if (e.type === "stage") console.log(`  · ${e.message}`);
    },
  );
  console.log("\nReferences:");
  for (const r of result.references) {
    console.log(
      `  ${r.ref} "${r.surface}" → ${r.entity ? `${r.entity.displayName} [${r.domain}]` : "NOT FOUND"} | ${r.job}${r.note ? ` | ${r.note}` : ""}`,
    );
  }
  for (const m of result.markets) {
    console.log(`\n--- ${m.marketId}\n${m.text}`);
    for (const d of m.decisions) {
      const alt = d.alternatives
        .slice(0, 3)
        .map((a) => a.entity.displayName)
        .join(", ");
      console.log(
        `  ${d.ref} ${d.action.toUpperCase()}${d.choice ? ` → ${d.choice.entity.displayName}` : ""}${d.triedDomain ? ` (via ${d.triedDomain})` : ""} [${d.confidence}] ${d.reason}${alt ? ` | alts: ${alt}` : ""}`,
      );
    }
    if (m.guardIssues.length) console.log(`  GUARD: ${m.guardIssues.join(", ")}`);
    if (m.note) console.log(`  NOTE: ${m.note}`);
  }
  console.log("\nModel-only baseline:");
  for (const b of result.baseline) {
    console.log(
      `  ${b.marketId}: ${b.swaps.map((s) => `${s.original}→${s.replacement} (${s.check})`).join("; ")}`,
    );
  }
  const s = result.stats;
  console.log(
    `\nStats: ${s.qlooCalls} Qloo calls, ${s.llmCalls} model calls, ${Math.round(s.ms / 1000)} s`,
  );
}
