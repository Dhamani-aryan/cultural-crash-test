import { q, ents, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync(OUT + "/anchors.json","utf8"));
// check result tags and multi-entity demographics
const r = await q("/v2/insights", { "filter.type":"urn:entity:brand", "signal.location.query":"Tokyo", "filter.tags":"urn:tag:genre:brand:dining", take: 5 });
const e = ents(r); console.log("dining Tokyo:", r.status, e.map(x=>x.name).join(" | ")); console.log("result has tags:", (e[0]?.tags??[]).length, Object.keys(e[0]??{}));
const d = await q("/v2/insights", { "filter.type":"urn:demographics", "signal.interests.entities": e.slice(0,3).map(x=>x.entity_id).concat(A["Chipotle"].entity_id) });
console.log("demographics multi:", d.status, JSON.stringify(d.body).slice(0,700));
const g = await q("/v2/tags/types"); console.log("tag types", g.status, JSON.stringify(g.body).slice(0,1200));
