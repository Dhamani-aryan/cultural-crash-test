import { q, ents, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync(OUT + "/shows.json","utf8"));
for (const s of ["Peaky Blinders","Friends"]) {
  const r = await q("/v2/insights", { "filter.type":"urn:heatmap", "signal.interests.entities": S[s].entity_id, "filter.location.query":"Bangalore", "output.heatmap.boundary":"neighborhood", take: 10 });
  const h = r.body?.results?.heatmap ?? [];
  console.log(`heatmap ${s} Bangalore ${r.status} n=${h.length}:`, h.slice(0,8).map(x=>`${x.location?.name ?? x.location?.geohash}(${x.query?.affinity?.toFixed?.(2)})`).join(" | "), JSON.stringify(h[0]??r.body).slice(0,300));
}
for (const n of ["Central Perk","Friends cafe","Peaky Blinders bar","Shelby"]) { const r = await q("/search", { query: n, types: "urn:entity:place", take: 6 }); console.log(`search ${n}:`, ents(r).map(x=>`${x.name} [${x.properties?.geocode?.city ?? x.properties?.address ?? ''}]`).join(" | ")); }
const d = await q("/v2/insights", { "filter.type":"urn:demographics", "signal.interests.entities":[S["Friends"].entity_id, S["Peaky Blinders"].entity_id] });
console.log("demographics:", JSON.stringify(d.body?.results?.demographics?.map(x=>x.query)));
