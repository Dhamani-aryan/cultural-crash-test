import { q, ents, save, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync(OUT + "/anchors.json","utf8"));
const names = (arr,n=10) => arr.slice(0,n).map(x=>`${x.name}[${(x.query?.affinity??0).toFixed(2)}/${x.popularity?.toFixed(2)}]`).join(" | ");
console.log("TJ tag sample:", JSON.stringify(A["Trader Joe's"].tags.slice(0,3)));
const ROLE = /genre:brand|lifestyle|core_value|cultural_relevance|customer_segment|aesthetic/;
async function translate(anchorName, type, city) {
  const a = A[anchorName];
  const tags = (a.tags??[]).filter(t=>ROLE.test(t.type ?? "")).map(t=>t.id ?? t.tag_id).slice(0,12);
  // Stage 1: local pool, location signal + anchor role tags (union)
  const s1 = await q("/v2/insights", { "filter.type":type, "signal.location.query":city, "signal.interests.tags":tags, "operator.signal.interests.tags":"union", take: 50 });
  // Stage 1b: local pool with location only
  const s1b = await q("/v2/insights", { "filter.type":type, "signal.location.query":city, take: 50 });
  const pool = [...new Map([...ents(s1), ...ents(s1b)].map(e=>[e.entity_id,e])).values()].filter(e=>e.entity_id!==a.entity_id);
  // Stage 2: score pool against the anchor (no location)
  const s2 = await q("/v2/insights", { "filter.type":type, "signal.interests.entities":a.entity_id, "filter.results.entities":pool.map(e=>e.entity_id), take: 50 });
  const s2l = await q("/v2/insights", { "filter.type":type, "signal.interests.entities":a.entity_id, "signal.location.query":city, "filter.results.entities":pool.map(e=>e.entity_id), take: 50 });
  console.log(`\n=== ${anchorName} -> ${city} (${type}) tags=${tags.length} pool=${pool.length} [s1 ${s1.status}, s2 ${s2.status} n=${ents(s2).length}]`);
  console.log("  stage1 tags+loc :", names(ents(s1),8));
  console.log("  stage2 anchor-ranked:", names(ents(s2),10));
  console.log("  stage2 anchor+loc   :", names(ents(s2l),10));
}
for (const [a,t] of [["Trader Joe's","urn:entity:brand"],["Chipotle","urn:entity:brand"],["Glossier","urn:entity:brand"]])
  for (const c of ["Tokyo","Mumbai","London"]) await translate(a,t,c);
