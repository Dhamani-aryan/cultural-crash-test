/**
 * Freeze an evaluation baseline: for every brief, draft the LLM plan once, resolve it in Qloo,
 * resolve the held-out anchors, and save it all under an explicit id.
 *
 *   BASELINE_ID=b1 npm run eval:freeze
 *
 * Then compare agent versions from these identical starting plans:
 *
 *   FROZEN=b1 EVAL_TAG=frozen-b1-v1 npm run eval:frozen
 *
 * An existing baseline is never overwritten: pick a new id to make a new one.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createMemoryCache } from "../src/lib/cache/cache";
import { createLedger } from "../src/lib/crashtest/ledger";
import { buildPlan, draftPlan, findInMarket, toRef } from "../src/lib/crashtest/plan";
import { LaunchBriefSchema } from "../src/lib/crashtest/types";
import { RUN_VERSION } from "../src/lib/crashtest/version";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { marketById } from "../src/lib/markets";
import { createQlooClient } from "../src/lib/qloo";
import { withCache } from "../src/lib/qloo/cached";
import { baselinePath, type Baseline, type BaselineCase } from "./baseline";
import { CASES } from "./cases";

const id = process.env.BASELINE_ID;
if (!id || !/^[\w-]+$/.test(id)) throw new Error("Set BASELINE_ID to a new name (letters, digits, - or _).");
const path = baselinePath(id);
if (existsSync(path)) throw new Error(`Baseline "${id}" already exists at ${path}. Baselines are never overwritten; choose a new id.`);

const llm = getLlm();
const qloo = withCache(createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} }), createMemoryCache(20_000));
const cases: BaselineCase[] = [];

for (const c of CASES) {
  process.stdout.write(`${c.id} … `);
  const brief = LaunchBriefSchema.parse(c.brief);
  const market = marketById(brief.marketId)!;
  const ctx = { client: qloo, ledger: createLedger(() => 0), market };
  const draft = await draftPlan(llm, brief, market);
  const { plan, notes } = await buildPlan({ llm, ctx, brief, draft, origin: "agent_proposed" });
  const names = [...c.heldOutAnchors, ...(c.heldOutSpares ?? [])];
  const found = await Promise.all(names.map((n) => findInMarket(qloo, n, ["brand", "artist"], market).catch(() => null)));
  cases.push({
    id: c.id,
    brief,
    initialPlan: plan,
    assumptions: [...draft.assumptions, ...notes],
    heldOut: names.map((name, i) => ({ name, ref: found[i] ? toRef(found[i]!) : null })),
    heldOutCount: c.heldOutAnchors.length,
  });
  console.log(plan.components.map((x) => x.label).join(" · "));
}

const baseline: Baseline = { id, createdAt: new Date().toISOString(), model: llm.model, runVersion: RUN_VERSION, cases };
mkdirSync("eval/out/baselines", { recursive: true });
writeFileSync(path, JSON.stringify(baseline, null, 2));
console.log(`wrote ${path}`);
