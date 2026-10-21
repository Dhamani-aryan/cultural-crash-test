/**
 * Shows what the agent proposes for one reference in one market, and what the engine does
 * with each proposal. Console only.
 *
 *   npm run live scripts/debug-proposals.ts -- "Dunkin' Donuts" brand london "cheap, no-fuss coffee and doughnuts"
 */
import { findByName } from "../src/lib/agent/check";
import { proposeCandidates } from "../src/lib/agent/propose";
import { findEquivalents } from "../src/lib/engine/equivalents";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { marketById, type Domain } from "../src/lib/markets";
import { createQlooClient } from "../src/lib/qloo";

const [name, domain, marketId, job] = process.argv.slice(2).filter((a) => a !== "--");
const qloo = createQlooClient({ ...getQlooEnv(), timeoutMs: 20_000, maxRetries: 4, onEmpty: () => {} });
const market = marketById(marketId)!;
const anchor = (await findByName(qloo, name, domain as Domain))!;
const ref = {
  ref: "R1",
  surface: name,
  name,
  kind: domain as Domain,
  job: job ?? "",
  entity: anchor,
  domain: domain as Domain,
  note: null,
};
const proposals = await proposeCandidates(getLlm(), qloo, {
  text: `It's the ${name} of its kind.`,
  market,
  references: [ref],
});
console.log("Proposed and found:", (proposals.get("R1") ?? []).map((e) => e.displayName));
const r = await findEquivalents(qloo, {
  anchor,
  domain: domain as Domain,
  market,
  take: 5,
  proposals: proposals.get("R1"),
});
console.log("anchor", r.anchor);
for (const e of r.equivalents) {
  console.log(
    `  ${e.proposed ? "*" : " "} ${e.entity.displayName} score=${e.score.toFixed(2)} role=${e.parts.role.toFixed(2)} rank=${e.localRank}/${e.poolSize} shares: ${e.sharedTags.join(", ")}`,
  );
}
console.log("rejected proposals:", r.rejected.filter((x) => x.proposed));
