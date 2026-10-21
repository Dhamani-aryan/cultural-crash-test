/**
 * Re-runs only the judge (both orders) on saved results, without running the agent again.
 *
 *   npm run live eval/rejudge.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { getLlm } from "../src/lib/llm";
import { mapLimit } from "../src/lib/engine/stats";
import { marketById } from "../src/lib/markets";
import { judgePair } from "./judge";
import type { CaseRow } from "./run";

const FILE = "eval/out/results.json";
const data = JSON.parse(readFileSync(FILE, "utf8")) as { ranAt: string; cases: CaseRow[] };
const llm = getLlm();
const jobs = data.cases.flatMap((c) =>
  c.markets.filter((m) => m.baseline && m.judge).map((m) => ({ c, m })),
);
await mapLimit(jobs, 3, async ({ c, m }) => {
  m.judge = await judgePair(
    llm,
    marketById(m.marketId)!,
    m.original,
    m.transcreate.text,
    m.baseline!.text,
  ).catch(() => null);
  process.stdout.write(`${c.id}/${m.marketId}: ${m.judge?.preferred ?? "error"}\n`);
});
writeFileSync(FILE, JSON.stringify(data, null, 2));
