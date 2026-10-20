import { q, ents, save, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync(OUT + "/anchors.json","utf8"));
const names = (r,n=10) => ents(r).slice(0,n).map(x=>`${x.name}[${x.popularity?.toFixed(2)}]`).join(" | ");
// anchor tags
for (const k of ["Trader Joe's","Chipotle","Peloton"]) {
  const e = A[k]; console.log(`\n${k} tags:`, (e.tags??[]).slice(0,25).map(t=>`${t.name}(${t.type?.replace('urn:tag:','')})`).join(", "));
}
// pure location signal per type
for (const type of ["brand","artist","tv_show","movie","book","podcast"]) {
  for (const city of ["Tokyo","Mumbai","Mexico City"]) {
    const r = await q("/v2/insights", { "filter.type":`urn:entity:${type}`, "signal.location.query": city, take: 10 });
    console.log(`\n[${type} | ${city}] ${r.status} ${r.ms}ms: ${names(r)}`);
  }
}
