import { q, ents, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync(OUT + "/shows.json","utf8"));
const nm = (r,n=5) => r.status!==200 ? `ERR ${r.status}` : `(${ents(r).length}) ` + ents(r).slice(0,n).map(x=>x.name).join(" | ");
const M = {
  "Friends": [["coffee shop","urn:tag:category:place:coffee_shop"],["pizza","urn:tag:genre:place:restaurant:pizza"]],
  "Peaky Blinders": [["irish pub","urn:tag:category:place:irish_pub"],["speakeasy","urn:tag:setting:qloo:speakeasy"],["pub","urn:tag:category:place:pub"]],
  "Emily in Paris": [["french","urn:tag:genre:place:restaurant:french"],["bakery","urn:tag:genre:place:restaurant:bakery"]],
  "The Bear": [["(no motif)",null]],
};
for (const city of ["New York City","London","Paris","Tokyo","Melbourne"]) { console.log(`\n##### ${city}`); for (const [s, ms] of Object.entries(M)) for (const [label, tag] of ms) {
  const r = await q("/v2/insights", { "filter.type":"urn:entity:place", "filter.tags": tag ?? undefined, "signal.interests.entities": S[s].entity_id, "filter.location.query": city, "bias.quality":"medium", take: 20 });
  console.log(`${s.padEnd(14)} ${label.padEnd(12)} ${nm(r)}`); } }
