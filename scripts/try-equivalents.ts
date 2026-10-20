/**
 * Live check of the equivalence engine. Prints the top equivalents per market with their
 * score parts. Output goes to the console only (Qloo terms: no stored responses).
 *
 *   npm run live scripts/try-equivalents.ts -- "Chipotle:brand" "The Office:tv_show"
 *   npm run live scripts/try-equivalents.ts -- "Taylor Swift:artist" --markets tokyo,london
 */
import { getQlooEnv } from "../src/lib/env";
import { findEquivalents } from "../src/lib/engine/equivalents";
import { DOMAINS, TARGET_MARKETS, type Domain } from "../src/lib/markets";
import { createQlooClient } from "../src/lib/qloo";

const args = process.argv.slice(2).filter((a) => a !== "--");
const marketsArg = args.indexOf("--markets");
const marketIds = marketsArg >= 0 ? args.splice(marketsArg, 2)[1].split(",") : null;
const markets = TARGET_MARKETS.filter((m) => !marketIds || marketIds.includes(m.id));
const client = createQlooClient({
  ...getQlooEnv(),
  timeoutMs: 20_000,
  maxRetries: 4,
  onEmpty: () => {},
});
const pct = (x: number) => Math.round(x * 100);

for (const spec of args) {
  const [name, domain] = spec.split(":") as [string, Domain];
  if (!DOMAINS.includes(domain)) throw new Error(`unknown domain in "${spec}"`);
  const [hit] = await client.searchEntities({
    query: name,
    types: [`urn:entity:${domain}`],
    take: 1,
  });
  if (!hit) {
    console.log(`\n${name}: not found`);
    continue;
  }
  const [anchor] = await client.getEntities([hit.id]);
  console.log(`\n### ${anchor.displayName} (${domain})`);
  for (const market of markets) {
    const t = Date.now();
    const r = await findEquivalents(client, { anchor, domain, market, take: 5 });
    const reasons = r.rejected.reduce<Record<string, number>>(
      (acc, x) => ((acc[x.reason] = (acc[x.reason] ?? 0) + 1), acc),
      {},
    );
    console.log(
      `  ${market.label.padEnd(10)} [${r.confidence}] pool ${r.poolSize}, ${r.qlooCalls} calls, ${Date.now() - t}ms, rejected ${JSON.stringify(reasons)}`,
    );
    for (const e of r.equivalents) {
      const p = e.parts;
      console.log(
        `     ${pct(e.score)}  ${e.entity.displayName}  (role ${p.role.toFixed(2)} · #${e.localRank} here, also in ${e.alsoIn.length} · aud ${p.audience?.toFixed(2) ?? "?"})  ${e.sharedTags.slice(0, 3).join(", ")}`,
      );
    }
  }
}
