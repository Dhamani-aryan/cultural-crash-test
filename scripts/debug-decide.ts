import { EXAMPLES } from "../src/components/examples";
import { decide } from "../src/lib/agent/decide";
import { extractReferences } from "../src/lib/agent/extract";
import { resolveReferences } from "../src/lib/agent/resolve";
import { findEquivalents, type EquivalentsResult } from "../src/lib/engine/equivalents";
import { getQlooEnv } from "../src/lib/env";
import { getLlm } from "../src/lib/llm";
import { marketById } from "../src/lib/markets";
import { createQlooClient } from "../src/lib/qloo";

const text = EXAMPLES[1].text;
const qloo = createQlooClient({ ...getQlooEnv(), maxRetries: 4, onEmpty: () => {} });
const llm = getLlm();
const market = marketById(process.argv[2] ?? "madrid")!;
const { references } = await extractReferences(llm, text);
console.log("extracted:", references.map((r) => `${r.ref} ${r.name} (${r.kind})`).join(" | "));
const resolved = await resolveReferences(qloo, references);
console.log("resolved:", resolved.map((r) => `${r.ref}→${r.entity?.name ?? "none"}`).join(" | "));
const eq = new Map<string, EquivalentsResult>();
for (const r of resolved)
  if (r.entity && r.domain)
    eq.set(
      r.ref,
      await findEquivalents(qloo, { anchor: r.entity, domain: r.domain, market, take: 5 }),
    );
const raw = await decide(llm, {
  text,
  market,
  references: resolved,
  equivalents: eq,
  allowTryDomain: true,
});
console.log("raw decisions:", JSON.stringify(raw, null, 1));
